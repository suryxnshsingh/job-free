// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./UserRegistry.sol";
import "./EscrowManager.sol";
import "./GovernanceToken.sol";

/**
 * @title DisputeResolution
 * @dev Handles dispute resolution through decentralized arbitration
 * @author FreelanceDAO Team
 */
contract DisputeResolution is Ownable, Pausable, ReentrancyGuard {
    
    enum DisputeStatus {
        Open,       // Dispute created, selecting arbitrators
        Voting,     // Arbitrators voting
        Resolved,   // Dispute resolved
        Appealed    // Under appeal
    }
    
    enum VoteChoice {
        None,
        Client,
        Freelancer
    }

    struct Dispute {
        uint256 id;
        uint256 jobId;
        uint256 escrowId;
        address client;
        address freelancer;
        address raisedBy;
        string reason;
        string evidence; // IPFS hash
        uint256 createdAt;
        uint256 votingDeadline;
        DisputeStatus status;
        address[] arbitrators;
        uint256 votesForClient;
        uint256 votesForFreelancer;
        address winner;
        uint256 clientPayout;
        uint256 freelancerPayout;
        bool isAppealed;
    }

    struct Vote {
        bool hasVoted;
        VoteChoice choice;
        string reasoning; // IPFS hash
        uint256 timestamp;
    }

    struct Arbitrator {
        address arbitratorAddress;
        uint256 reputation;
        uint256 totalCases;
        uint256 successfulCases;
        uint256 stakedAmount;
        bool isActive;
        bool isSlashed;
        uint256 joinedAt;
    }

    struct Evidence {
        address submittedBy;
        string evidenceHash; // IPFS hash
        uint256 timestamp;
        string description;
    }

    // State variables
    UserRegistry public immutable userRegistry;
    EscrowManager public immutable escrowManager;
    GovernanceToken public immutable governanceToken;

    mapping(uint256 => Dispute) public disputes;
    mapping(uint256 => mapping(address => Vote)) public votes;
    mapping(uint256 => Evidence[]) public disputeEvidence;
    mapping(address => Arbitrator) public arbitrators;
    mapping(address => uint256[]) public arbitratorCases;
    
    address[] public activeArbitrators;
    uint256 public nextDisputeId = 1;
    
    // Configuration constants
    uint256 public constant ARBITRATOR_COUNT = 3;
    uint256 public constant VOTING_PERIOD = 3 days;
    uint256 public constant APPEAL_PERIOD = 24 hours;
    uint256 public constant MIN_ARBITRATOR_STAKE = 1000 * 10**18; // 1000 tokens
    uint256 public constant ARBITRATOR_REWARD = 50 * 10**18; // 50 tokens per case
    uint256 public constant DISPUTE_FEE = 100 * 10**18; // 100 tokens to raise dispute
    
    // Statistics
    uint256 public totalDisputes;
    uint256 public resolvedDisputes;
    uint256 public totalArbitrators;
    
    // Events
    event DisputeCreated(
        uint256 indexed disputeId,
        uint256 indexed jobId,
        address indexed raisedBy,
        address client,
        address freelancer
    );
    event ArbitratorsSelected(uint256 indexed disputeId, address[] arbitrators);
    event VoteCast(
        uint256 indexed disputeId,
        address indexed arbitrator,
        VoteChoice choice
    );
    event DisputeResolved(
        uint256 indexed disputeId,
        address indexed winner,
        uint256 clientPayout,
        uint256 freelancerPayout
    );
    event DisputeAppealed(uint256 indexed disputeId, address appealedBy);
    event EvidenceSubmitted(
        uint256 indexed disputeId,
        address indexed submittedBy,
        string evidenceHash
    );
    event ArbitratorRegistered(address indexed arbitrator, uint256 stakedAmount);
    event ArbitratorSlashed(address indexed arbitrator, uint256 amount, string reason);
    event ArbitratorRewarded(address indexed arbitrator, uint256 amount);

    // Errors
    error DisputeNotFound();
    error InvalidDisputeStatus();
    error NotAuthorized();
    error AlreadyVoted();
    error VotingPeriodEnded();
    error VotingPeriodNotEnded();
    error InsufficientArbitrators();
    error AlreadyArbitrator();
    error NotArbitrator();
    error InsufficientStake();
    error InvalidVote();
    error ArbitratorSlashed();
    error InvalidAmount();
    error AppealPeriodEnded();

    modifier onlyDisputed(uint256 _disputeId) {
        if (_disputeId == 0 || _disputeId >= nextDisputeId) revert DisputeNotFound();
        _;
    }

    modifier onlyArbitrator() {
        if (!arbitrators[msg.sender].isActive || arbitrators[msg.sender].isSlashed) {
            revert NotArbitrator();
        }
        _;
    }

    constructor(
        address _userRegistry,
        address _escrowManager,
        address _governanceToken
    ) {
        userRegistry = UserRegistry(_userRegistry);
        escrowManager = EscrowManager(_escrowManager);
        governanceToken = GovernanceToken(_governanceToken);
    }

    /**
     * @dev Register as an arbitrator
     * @param _stakeAmount Amount of tokens to stake
     */
    function registerAsArbitrator(uint256 _stakeAmount) external whenNotPaused nonReentrant {
        if (arbitrators[msg.sender].arbitratorAddress != address(0)) revert AlreadyArbitrator();
        if (_stakeAmount < MIN_ARBITRATOR_STAKE) revert InsufficientStake();

        // Transfer stake to this contract
        governanceToken.transferFrom(msg.sender, address(this), _stakeAmount);

        // Register arbitrator
        arbitrators[msg.sender] = Arbitrator({
            arbitratorAddress: msg.sender,
            reputation: 500, // Start with neutral reputation
            totalCases: 0,
            successfulCases: 0,
            stakedAmount: _stakeAmount,
            isActive: true,
            isSlashed: false,
            joinedAt: block.timestamp
        });

        activeArbitrators.push(msg.sender);
        totalArbitrators++;

        emit ArbitratorRegistered(msg.sender, _stakeAmount);
    }

    /**
     * @dev Create a new dispute
     * @param _jobId Associated job ID
     * @param _escrowId Associated escrow ID
     * @param _client Client address
     * @param _freelancer Freelancer address
     * @param _reason Reason for dispute
     * @param _evidence IPFS hash of evidence
     */
    function createDispute(
        uint256 _jobId,
        uint256 _escrowId,
        address _client,
        address _freelancer,
        string calldata _reason,
        string calldata _evidence
    ) external whenNotPaused nonReentrant returns (uint256 disputeId) {
        if (msg.sender != _client && msg.sender != _freelancer) revert NotAuthorized();
        
        // Charge dispute fee
        governanceToken.transferFrom(msg.sender, address(this), DISPUTE_FEE);

        disputeId = nextDisputeId++;

        // Create dispute
        disputes[disputeId] = Dispute({
            id: disputeId,
            jobId: _jobId,
            escrowId: _escrowId,
            client: _client,
            freelancer: _freelancer,
            raisedBy: msg.sender,
            reason: _reason,
            evidence: _evidence,
            createdAt: block.timestamp,
            votingDeadline: 0,
            status: DisputeStatus.Open,
            arbitrators: new address[](0),
            votesForClient: 0,
            votesForFreelancer: 0,
            winner: address(0),
            clientPayout: 0,
            freelancerPayout: 0,
            isAppealed: false
        });

        totalDisputes++;

        // Start dispute in escrow
        escrowManager.startDispute(_escrowId);

        emit DisputeCreated(disputeId, _jobId, msg.sender, _client, _freelancer);

        // Automatically select arbitrators
        _selectArbitrators(disputeId);
    }

    /**
     * @dev Select random arbitrators for a dispute
     * @param _disputeId Dispute ID
     */
    function _selectArbitrators(uint256 _disputeId) internal {
        if (activeArbitrators.length < ARBITRATOR_COUNT) revert InsufficientArbitrators();

        Dispute storage dispute = disputes[_disputeId];
        dispute.status = DisputeStatus.Voting;
        dispute.votingDeadline = block.timestamp + VOTING_PERIOD;

        // Simple pseudo-random selection (in production, use Chainlink VRF)
        address[] memory selectedArbitrators = new address[](ARBITRATOR_COUNT);
        uint256 selectedCount = 0;
        uint256 nonce = uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty, _disputeId)));

        for (uint256 i = 0; i < activeArbitrators.length && selectedCount < ARBITRATOR_COUNT; i++) {
            uint256 randomIndex = (nonce + i) % activeArbitrators.length;
            address candidate = activeArbitrators[randomIndex];
            
            // Check if arbitrator is eligible and not already selected
            if (arbitrators[candidate].isActive && 
                !arbitrators[candidate].isSlashed &&
                !_isArbitratorSelected(selectedArbitrators, candidate, selectedCount)) {
                
                selectedArbitrators[selectedCount] = candidate;
                selectedCount++;
            }
        }

        if (selectedCount < ARBITRATOR_COUNT) revert InsufficientArbitrators();

        // Add selected arbitrators to dispute
        for (uint256 i = 0; i < ARBITRATOR_COUNT; i++) {
            dispute.arbitrators.push(selectedArbitrators[i]);
            arbitratorCases[selectedArbitrators[i]].push(_disputeId);
        }

        emit ArbitratorsSelected(_disputeId, selectedArbitrators);
    }

    /**
     * @dev Check if arbitrator is already selected
     */
    function _isArbitratorSelected(
        address[] memory selected,
        address arbitrator,
        uint256 count
    ) internal pure returns (bool) {
        for (uint256 i = 0; i < count; i++) {
            if (selected[i] == arbitrator) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Cast vote on a dispute
     * @param _disputeId Dispute ID
     * @param _choice Vote choice (Client or Freelancer)
     * @param _reasoning IPFS hash of reasoning
     */
    function castVote(
        uint256 _disputeId,
        VoteChoice _choice,
        string calldata _reasoning
    ) external onlyDisputed(_disputeId) onlyArbitrator whenNotPaused {
        Dispute storage dispute = disputes[_disputeId];
        
        if (dispute.status != DisputeStatus.Voting) revert InvalidDisputeStatus();
        if (block.timestamp > dispute.votingDeadline) revert VotingPeriodEnded();
        if (votes[_disputeId][msg.sender].hasVoted) revert AlreadyVoted();
        if (_choice == VoteChoice.None) revert InvalidVote();

        // Check if sender is an arbitrator for this dispute
        bool isAssignedArbitrator = false;
        for (uint256 i = 0; i < dispute.arbitrators.length; i++) {
            if (dispute.arbitrators[i] == msg.sender) {
                isAssignedArbitrator = true;
                break;
            }
        }
        if (!isAssignedArbitrator) revert NotAuthorized();

        // Record vote
        votes[_disputeId][msg.sender] = Vote({
            hasVoted: true,
            choice: _choice,
            reasoning: _reasoning,
            timestamp: block.timestamp
        });

        // Update vote counts
        if (_choice == VoteChoice.Client) {
            dispute.votesForClient++;
        } else {
            dispute.votesForFreelancer++;
        }

        arbitrators[msg.sender].totalCases++;

        emit VoteCast(_disputeId, msg.sender, _choice);

        // Check if all arbitrators have voted
        if (dispute.votesForClient + dispute.votesForFreelancer == ARBITRATOR_COUNT) {
            _resolveDispute(_disputeId);
        }
    }

    /**
     * @dev Resolve dispute after voting period
     * @param _disputeId Dispute ID
     */
    function resolveDispute(uint256 _disputeId) external onlyDisputed(_disputeId) {
        Dispute storage dispute = disputes[_disputeId];
        
        if (dispute.status != DisputeStatus.Voting) revert InvalidDisputeStatus();
        if (block.timestamp <= dispute.votingDeadline) revert VotingPeriodNotEnded();

        _resolveDispute(_disputeId);
    }

    /**
     * @dev Internal function to resolve dispute
     * @param _disputeId Dispute ID
     */
    function _resolveDispute(uint256 _disputeId) internal {
        Dispute storage dispute = disputes[_disputeId];
        dispute.status = DisputeStatus.Resolved;

        // Determine winner and payouts
        if (dispute.votesForClient > dispute.votesForFreelancer) {
            dispute.winner = dispute.client;
            dispute.clientPayout = _calculatePayout(dispute.escrowId, true);
            dispute.freelancerPayout = 0;
        } else if (dispute.votesForFreelancer > dispute.votesForClient) {
            dispute.winner = dispute.freelancer;
            dispute.clientPayout = 0;
            dispute.freelancerPayout = _calculatePayout(dispute.escrowId, false);
        } else {
            // Tie - split the funds
            uint256 totalAmount = _getEscrowAmount(dispute.escrowId);
            dispute.clientPayout = totalAmount / 2;
            dispute.freelancerPayout = totalAmount / 2;
            dispute.winner = address(0); // No clear winner
        }

        // Resolve in escrow manager
        escrowManager.resolveDispute(
            dispute.escrowId,
            dispute.winner,
            dispute.clientPayout,
            dispute.freelancerPayout
        );

        // Reward arbitrators who voted with the majority
        _rewardArbitrators(_disputeId);

        resolvedDisputes++;

        emit DisputeResolved(
            _disputeId,
            dispute.winner,
            dispute.clientPayout,
            dispute.freelancerPayout
        );
    }

    /**
     * @dev Calculate payout amount based on dispute outcome
     * @param _escrowId Escrow ID
     * @param _clientWins Whether client wins
     * @return payout amount
     */
    function _calculatePayout(uint256 _escrowId, bool _clientWins) internal view returns (uint256) {
        uint256 totalAmount = _getEscrowAmount(_escrowId);
        
        // If client wins, they get full refund
        // If freelancer wins, they get payment minus platform fee
        if (_clientWins) {
            return totalAmount;
        } else {
            // Freelancer gets amount minus dispute handling fee
            return (totalAmount * 95) / 100; // 5% dispute handling fee
        }
    }

    /**
     * @dev Get escrow amount from escrow manager
     * @param _escrowId Escrow ID
     * @return amount
     */
    function _getEscrowAmount(uint256 _escrowId) internal view returns (uint256) {
        EscrowManager.Escrow memory escrow = escrowManager.getEscrow(_escrowId);
        return escrow.amount;
    }

    /**
     * @dev Reward arbitrators who voted with the majority
     * @param _disputeId Dispute ID
     */
    function _rewardArbitrators(uint256 _disputeId) internal {
        Dispute storage dispute = disputes[_disputeId];
        VoteChoice majorityVote;
        
        if (dispute.votesForClient > dispute.votesForFreelancer) {
            majorityVote = VoteChoice.Client;
        } else if (dispute.votesForFreelancer > dispute.votesForClient) {
            majorityVote = VoteChoice.Freelancer;
        } else {
            // Tie - reward all arbitrators
            majorityVote = VoteChoice.None;
        }

        for (uint256 i = 0; i < dispute.arbitrators.length; i++) {
            address arbitrator = dispute.arbitrators[i];
            Vote storage vote = votes[_disputeId][arbitrator];
            
            if (vote.hasVoted && (vote.choice == majorityVote || majorityVote == VoteChoice.None)) {
                // Reward arbitrator
                governanceToken.transfer(arbitrator, ARBITRATOR_REWARD);
                arbitrators[arbitrator].successfulCases++;
                
                emit ArbitratorRewarded(arbitrator, ARBITRATOR_REWARD);
            } else if (vote.hasVoted) {
                // Slash arbitrator for voting against majority (minor slash)
                uint256 slashAmount = arbitrators[arbitrator].stakedAmount / 20; // 5% slash
                _slashArbitrator(arbitrator, slashAmount, "Voted against clear majority");
            }
        }
    }

    /**
     * @dev Submit additional evidence for a dispute
     * @param _disputeId Dispute ID
     * @param _evidenceHash IPFS hash of evidence
     * @param _description Description of evidence
     */
    function submitEvidence(
        uint256 _disputeId,
        string calldata _evidenceHash,
        string calldata _description
    ) external onlyDisputed(_disputeId) {
        Dispute storage dispute = disputes[_disputeId];
        
        if (msg.sender != dispute.client && msg.sender != dispute.freelancer) {
            revert NotAuthorized();
        }
        if (dispute.status != DisputeStatus.Voting) revert InvalidDisputeStatus();

        disputeEvidence[_disputeId].push(Evidence({
            submittedBy: msg.sender,
            evidenceHash: _evidenceHash,
            timestamp: block.timestamp,
            description: _description
        }));

        emit EvidenceSubmitted(_disputeId, msg.sender, _evidenceHash);
    }

    /**
     * @dev Slash an arbitrator for misconduct
     * @param _arbitrator Arbitrator address
     * @param _amount Amount to slash
     * @param _reason Reason for slashing
     */
    function _slashArbitrator(address _arbitrator, uint256 _amount, string memory _reason) internal {
        Arbitrator storage arbitrator = arbitrators[_arbitrator];
        
        if (_amount > arbitrator.stakedAmount) {
            _amount = arbitrator.stakedAmount;
        }

        arbitrator.stakedAmount -= _amount;
        
        if (arbitrator.stakedAmount < MIN_ARBITRATOR_STAKE) {
            arbitrator.isActive = false;
            arbitrator.isSlashed = true;
            _removeFromActiveArbitrators(_arbitrator);
        }

        // Transfer slashed amount to fee collector
        governanceToken.transfer(owner(), _amount);

        emit ArbitratorSlashed(_arbitrator, _amount, _reason);
    }

    /**
     * @dev Remove arbitrator from active list
     * @param _arbitrator Arbitrator to remove
     */
    function _removeFromActiveArbitrators(address _arbitrator) internal {
        for (uint256 i = 0; i < activeArbitrators.length; i++) {
            if (activeArbitrators[i] == _arbitrator) {
                activeArbitrators[i] = activeArbitrators[activeArbitrators.length - 1];
                activeArbitrators.pop();
                break;
            }
        }
    }

    /**
     * @dev Get dispute details
     * @param _disputeId Dispute ID
     * @return dispute Dispute details
     */
    function getDispute(uint256 _disputeId) external view returns (Dispute memory) {
        return disputes[_disputeId];
    }

    /**
     * @dev Get evidence for a dispute
     * @param _disputeId Dispute ID
     * @return evidence Array of evidence
     */
    function getDisputeEvidence(uint256 _disputeId) external view returns (Evidence[] memory) {
        return disputeEvidence[_disputeId];
    }

    /**
     * @dev Get arbitrator cases
     * @param _arbitrator Arbitrator address
     * @return cases Array of case IDs
     */
    function getArbitratorCases(address _arbitrator) external view returns (uint256[] memory) {
        return arbitratorCases[_arbitrator];
    }

    /**
     * @dev Get platform dispute statistics
     * @return total Total disputes
     * @return resolved Resolved disputes
     * @return activeArbitratorCount Active arbitrators
     */
    function getDisputeStats() external view returns (
        uint256 total,
        uint256 resolved,
        uint256 activeArbitratorCount
    ) {
        return (totalDisputes, resolvedDisputes, activeArbitrators.length);
    }

    /**
     * @dev Emergency pause
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}