// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title EscrowManager
 * @dev Manages escrow for freelance jobs with multi-token support and auto-release
 * @author FreelanceDAO Team
 */
contract EscrowManager is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // Escrow structure
    struct Escrow {
        uint256 jobId;
        address client;
        address freelancer;
        address token; // Address(0) for ETH
        uint256 amount;
        uint256 releaseTime;
        uint256 createdAt;
        bool isReleased;
        bool isRefunded;
        bool isDisputed;
        string terms; // IPFS hash of escrow terms
    }

    // Milestone structure for complex projects
    struct Milestone {
        uint256 escrowId;
        uint256 amount;
        string description;
        bool isCompleted;
        bool isPaid;
        uint256 dueDate;
    }

    // State variables
    mapping(uint256 => Escrow) public escrows;
    mapping(uint256 => Milestone[]) public milestones;
    mapping(address => bool) public supportedTokens;
    mapping(address => uint256) public tokenBalances; // Track token balances
    mapping(address => bool) public authorizedCallers; // Authorized contracts
    
    uint256 public nextEscrowId = 1;
    uint256 public constant AUTO_RELEASE_DELAY = 7 days;
    uint256 public constant MAX_ESCROW_PERIOD = 365 days;
    uint256 public platformFeeRate = 250; // 2.5% in basis points
    uint256 public constant BASIS_POINTS = 10000;
    address public feeCollector;
    
    // Statistics
    uint256 public totalEscrowsCreated;
    uint256 public totalAmountEscrowed;
    uint256 public totalFeesCollected;
    
    // Events
    event EscrowCreated(
        uint256 indexed escrowId,
        uint256 indexed jobId,
        address indexed client,
        address freelancer,
        address token,
        uint256 amount
    );
    event FundsReleased(
        uint256 indexed escrowId,
        address indexed to,
        uint256 amount,
        uint256 fee
    );
    event FundsRefunded(
        uint256 indexed escrowId,
        address indexed to,
        uint256 amount
    );
    event AutoReleaseTriggered(uint256 indexed escrowId);
    event DisputeStarted(uint256 indexed escrowId);
    event DisputeResolved(uint256 indexed escrowId, address winner);
    event MilestoneCreated(uint256 indexed escrowId, uint256 milestoneIndex, uint256 amount);
    event MilestoneCompleted(uint256 indexed escrowId, uint256 milestoneIndex);
    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);
    event FeeRateUpdated(uint256 oldRate, uint256 newRate);

    // Errors
    error InvalidJobId();
    error InvalidAmount();
    error InvalidToken();
    error UnauthorizedAccess();
    error EscrowNotFound();
    error EscrowAlreadyResolved();
    error InsufficientBalance();
    error TransferFailed();
    error AutoReleaseNotReady();
    error InvalidMilestone();
    error MilestoneAlreadyCompleted();
    error InvalidFeeRate();
    error ZeroAddress();

    modifier onlyAuthorized() {
        if (!authorizedCallers[msg.sender] && msg.sender != owner()) {
            revert UnauthorizedAccess();
        }
        _;
    }

    modifier validEscrow(uint256 _escrowId) {
        if (_escrowId == 0 || _escrowId >= nextEscrowId) revert EscrowNotFound();
        _;
    }

    modifier escrowNotResolved(uint256 _escrowId) {
        Escrow storage escrow = escrows[_escrowId];
        if (escrow.isReleased || escrow.isRefunded) revert EscrowAlreadyResolved();
        _;
    }

    constructor(address _feeCollector) {
        if (_feeCollector == address(0)) revert ZeroAddress();
        feeCollector = _feeCollector;
        
        // Add ETH as supported token (address(0))
        supportedTokens[address(0)] = true;
    }

    /**
     * @dev Create a new escrow
     * @param _jobId Associated job ID
     * @param _freelancer Freelancer address
     * @param _token Token address (address(0) for ETH)
     * @param _amount Amount to escrow
     * @param _terms IPFS hash of escrow terms
     */
    function createEscrow(
        uint256 _jobId,
        address _freelancer,
        address _token,
        uint256 _amount,
        string calldata _terms
    ) external payable onlyAuthorized whenNotPaused nonReentrant returns (uint256 escrowId) {
        if (_jobId == 0) revert InvalidJobId();
        if (_freelancer == address(0)) revert ZeroAddress();
        if (_amount == 0) revert InvalidAmount();
        if (!supportedTokens[_token]) revert InvalidToken();

        escrowId = nextEscrowId++;

        // Handle ETH vs ERC20 deposits
        if (_token == address(0)) {
            if (msg.value != _amount) revert InvalidAmount();
        } else {
            if (msg.value != 0) revert InvalidAmount();
            IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
            tokenBalances[_token] += _amount;
        }

        // Create escrow
        escrows[escrowId] = Escrow({
            jobId: _jobId,
            client: msg.sender,
            freelancer: _freelancer,
            token: _token,
            amount: _amount,
            releaseTime: block.timestamp + AUTO_RELEASE_DELAY,
            createdAt: block.timestamp,
            isReleased: false,
            isRefunded: false,
            isDisputed: false,
            terms: _terms
        });

        // Update statistics
        totalEscrowsCreated++;
        totalAmountEscrowed += _amount;

        emit EscrowCreated(escrowId, _jobId, msg.sender, _freelancer, _token, _amount);
    }

    /**
     * @dev Create milestones for an escrow
     * @param _escrowId Escrow ID
     * @param _amounts Array of milestone amounts
     * @param _descriptions Array of milestone descriptions
     * @param _dueDates Array of milestone due dates
     */
    function createMilestones(
        uint256 _escrowId,
        uint256[] calldata _amounts,
        string[] calldata _descriptions,
        uint256[] calldata _dueDates
    ) external onlyAuthorized validEscrow(_escrowId) {
        if (_amounts.length != _descriptions.length || _amounts.length != _dueDates.length) {
            revert InvalidMilestone();
        }

        Escrow storage escrow = escrows[_escrowId];
        if (msg.sender != escrow.client) revert UnauthorizedAccess();

        uint256 totalMilestoneAmount = 0;
        for (uint256 i = 0; i < _amounts.length; i++) {
            if (_amounts[i] == 0) revert InvalidAmount();
            if (_dueDates[i] <= block.timestamp) revert InvalidMilestone();
            
            milestones[_escrowId].push(Milestone({
                escrowId: _escrowId,
                amount: _amounts[i],
                description: _descriptions[i],
                isCompleted: false,
                isPaid: false,
                dueDate: _dueDates[i]
            }));

            totalMilestoneAmount += _amounts[i];
            emit MilestoneCreated(_escrowId, i, _amounts[i]);
        }

        if (totalMilestoneAmount != escrow.amount) revert InvalidAmount();
    }

    /**
     * @dev Release funds to freelancer
     * @param _escrowId Escrow ID
     */
    function releaseFunds(uint256 _escrowId) 
        external 
        onlyAuthorized 
        validEscrow(_escrowId) 
        escrowNotResolved(_escrowId)
        nonReentrant 
    {
        Escrow storage escrow = escrows[_escrowId];
        if (msg.sender != escrow.client && msg.sender != owner()) {
            revert UnauthorizedAccess();
        }

        escrow.isReleased = true;

        // Calculate platform fee
        uint256 fee = (escrow.amount * platformFeeRate) / BASIS_POINTS;
        uint256 freelancerAmount = escrow.amount - fee;

        // Transfer funds
        _transferFunds(escrow.token, escrow.freelancer, freelancerAmount);
        
        if (fee > 0) {
            _transferFunds(escrow.token, feeCollector, fee);
            totalFeesCollected += fee;
        }

        emit FundsReleased(_escrowId, escrow.freelancer, freelancerAmount, fee);
    }

    /**
     * @dev Release funds for a specific milestone
     * @param _escrowId Escrow ID
     * @param _milestoneIndex Milestone index
     */
    function releaseMilestone(uint256 _escrowId, uint256 _milestoneIndex)
        external
        onlyAuthorized
        validEscrow(_escrowId)
        nonReentrant
    {
        Escrow storage escrow = escrows[_escrowId];
        if (msg.sender != escrow.client) revert UnauthorizedAccess();

        Milestone[] storage projectMilestones = milestones[_escrowId];
        if (_milestoneIndex >= projectMilestones.length) revert InvalidMilestone();

        Milestone storage milestone = projectMilestones[_milestoneIndex];
        if (milestone.isPaid) revert MilestoneAlreadyCompleted();
        if (!milestone.isCompleted) revert InvalidMilestone();

        milestone.isPaid = true;

        // Calculate platform fee for milestone
        uint256 fee = (milestone.amount * platformFeeRate) / BASIS_POINTS;
        uint256 freelancerAmount = milestone.amount - fee;

        // Transfer funds
        _transferFunds(escrow.token, escrow.freelancer, freelancerAmount);
        
        if (fee > 0) {
            _transferFunds(escrow.token, feeCollector, fee);
            totalFeesCollected += fee;
        }

        emit FundsReleased(_escrowId, escrow.freelancer, freelancerAmount, fee);
    }

    /**
     * @dev Refund funds to client
     * @param _escrowId Escrow ID
     */
    function refundFunds(uint256 _escrowId) 
        external 
        onlyAuthorized 
        validEscrow(_escrowId) 
        escrowNotResolved(_escrowId)
        nonReentrant 
    {
        Escrow storage escrow = escrows[_escrowId];
        if (msg.sender != escrow.client && msg.sender != owner()) {
            revert UnauthorizedAccess();
        }

        escrow.isRefunded = true;

        _transferFunds(escrow.token, escrow.client, escrow.amount);

        emit FundsRefunded(_escrowId, escrow.client, escrow.amount);
    }

    /**
     * @dev Auto-release funds after deadline
     * @param _escrowId Escrow ID
     */
    function autoRelease(uint256 _escrowId) 
        external 
        validEscrow(_escrowId) 
        escrowNotResolved(_escrowId)
        nonReentrant 
    {
        Escrow storage escrow = escrows[_escrowId];
        
        if (block.timestamp < escrow.releaseTime) revert AutoReleaseNotReady();
        if (escrow.isDisputed) revert EscrowAlreadyResolved();

        escrow.isReleased = true;

        // Calculate platform fee
        uint256 fee = (escrow.amount * platformFeeRate) / BASIS_POINTS;
        uint256 freelancerAmount = escrow.amount - fee;

        // Transfer funds
        _transferFunds(escrow.token, escrow.freelancer, freelancerAmount);
        
        if (fee > 0) {
            _transferFunds(escrow.token, feeCollector, fee);
            totalFeesCollected += fee;
        }

        emit AutoReleaseTriggered(_escrowId);
        emit FundsReleased(_escrowId, escrow.freelancer, freelancerAmount, fee);
    }

    /**
     * @dev Mark escrow as disputed
     * @param _escrowId Escrow ID
     */
    function startDispute(uint256 _escrowId) 
        external 
        onlyAuthorized 
        validEscrow(_escrowId) 
        escrowNotResolved(_escrowId) 
    {
        Escrow storage escrow = escrows[_escrowId];
        if (msg.sender != escrow.client && msg.sender != escrow.freelancer) {
            revert UnauthorizedAccess();
        }

        escrow.isDisputed = true;

        emit DisputeStarted(_escrowId);
    }

    /**
     * @dev Resolve dispute (called by dispute resolution contract)
     * @param _escrowId Escrow ID
     * @param _winner Winner of the dispute
     * @param _clientAmount Amount to send to client
     * @param _freelancerAmount Amount to send to freelancer
     */
    function resolveDispute(
        uint256 _escrowId,
        address _winner,
        uint256 _clientAmount,
        uint256 _freelancerAmount
    ) external onlyAuthorized validEscrow(_escrowId) nonReentrant {
        Escrow storage escrow = escrows[_escrowId];
        if (!escrow.isDisputed) revert UnauthorizedAccess();
        if (_clientAmount + _freelancerAmount > escrow.amount) revert InvalidAmount();

        escrow.isReleased = true;

        // Transfer funds according to dispute resolution
        if (_clientAmount > 0) {
            _transferFunds(escrow.token, escrow.client, _clientAmount);
        }
        if (_freelancerAmount > 0) {
            _transferFunds(escrow.token, escrow.freelancer, _freelancerAmount);
        }

        // Any remaining amount goes to platform as dispute fee
        uint256 remainingAmount = escrow.amount - _clientAmount - _freelancerAmount;
        if (remainingAmount > 0) {
            _transferFunds(escrow.token, feeCollector, remainingAmount);
            totalFeesCollected += remainingAmount;
        }

        emit DisputeResolved(_escrowId, _winner);
    }

    /**
     * @dev Mark a milestone as completed
     * @param _escrowId Escrow ID
     * @param _milestoneIndex Milestone index
     */
    function completeMilestone(uint256 _escrowId, uint256 _milestoneIndex)
        external
        onlyAuthorized
        validEscrow(_escrowId)
    {
        Escrow storage escrow = escrows[_escrowId];
        if (msg.sender != escrow.freelancer) revert UnauthorizedAccess();

        Milestone[] storage projectMilestones = milestones[_escrowId];
        if (_milestoneIndex >= projectMilestones.length) revert InvalidMilestone();

        Milestone storage milestone = projectMilestones[_milestoneIndex];
        if (milestone.isCompleted) revert MilestoneAlreadyCompleted();

        milestone.isCompleted = true;

        emit MilestoneCompleted(_escrowId, _milestoneIndex);
    }

    /**
     * @dev Internal function to transfer funds
     * @param _token Token address (address(0) for ETH)
     * @param _to Recipient address
     * @param _amount Amount to transfer
     */
    function _transferFunds(address _token, address _to, uint256 _amount) internal {
        if (_amount == 0) return;

        if (_token == address(0)) {
            (bool success, ) = _to.call{value: _amount}("");
            if (!success) revert TransferFailed();
        } else {
            tokenBalances[_token] -= _amount;
            IERC20(_token).safeTransfer(_to, _amount);
        }
    }

    /**
     * @dev Add supported token
     * @param _token Token address to add
     */
    function addSupportedToken(address _token) external onlyOwner {
        supportedTokens[_token] = true;
        emit TokenAdded(_token);
    }

    /**
     * @dev Remove supported token
     * @param _token Token address to remove
     */
    function removeSupportedToken(address _token) external onlyOwner {
        supportedTokens[_token] = false;
        emit TokenRemoved(_token);
    }

    /**
     * @dev Add authorized caller
     * @param _caller Address to authorize
     */
    function addAuthorizedCaller(address _caller) external onlyOwner {
        authorizedCallers[_caller] = true;
    }

    /**
     * @dev Remove authorized caller
     * @param _caller Address to remove authorization
     */
    function removeAuthorizedCaller(address _caller) external onlyOwner {
        authorizedCallers[_caller] = false;
    }

    /**
     * @dev Update platform fee rate
     * @param _newRate New fee rate in basis points
     */
    function updateFeeRate(uint256 _newRate) external onlyOwner {
        if (_newRate > 1000) revert InvalidFeeRate(); // Max 10%
        
        uint256 oldRate = platformFeeRate;
        platformFeeRate = _newRate;
        
        emit FeeRateUpdated(oldRate, _newRate);
    }

    /**
     * @dev Update fee collector address
     * @param _newCollector New fee collector address
     */
    function updateFeeCollector(address _newCollector) external onlyOwner {
        if (_newCollector == address(0)) revert ZeroAddress();
        feeCollector = _newCollector;
    }

    /**
     * @dev Get escrow details
     * @param _escrowId Escrow ID
     * @return escrow Escrow details
     */
    function getEscrow(uint256 _escrowId) external view returns (Escrow memory escrow) {
        return escrows[_escrowId];
    }

    /**
     * @dev Get milestones for an escrow
     * @param _escrowId Escrow ID
     * @return projectMilestones Array of milestones
     */
    function getMilestones(uint256 _escrowId) external view returns (Milestone[] memory projectMilestones) {
        return milestones[_escrowId];
    }

    /**
     * @dev Get platform statistics
     * @return totalEscrows Total escrows created
     * @return totalAmount Total amount escrowed
     * @return totalFees Total fees collected
     */
    function getPlatformStats() external view returns (
        uint256 totalEscrows,
        uint256 totalAmount,
        uint256 totalFees
    ) {
        return (totalEscrowsCreated, totalAmountEscrowed, totalFeesCollected);
    }

    /**
     * @dev Emergency function to pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Emergency withdrawal function (only owner)
     * @param _token Token address (address(0) for ETH)
     * @param _amount Amount to withdraw
     */
    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        if (_token == address(0)) {
            (bool success, ) = owner().call{value: _amount}("");
            if (!success) revert TransferFailed();
        } else {
            IERC20(_token).safeTransfer(owner(), _amount);
        }
    }

    receive() external payable {
        // Allow contract to receive ETH
    }
}