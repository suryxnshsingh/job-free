// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./UserRegistry.sol";
import "./EscrowManager.sol";
import "./DisputeResolution.sol";
import "./GovernanceToken.sol";

/**
 * @title FreelanceJob
 * @dev Main contract for freelance job management and coordination
 * @author FreelanceDAO Team
 */
contract FreelanceJob is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum JobStatus {
        Open,           // Job posted, accepting bids
        Assigned,       // Freelancer selected
        InProgress,     // Work in progress
        Submitted,      // Work submitted for review
        Completed,      // Job completed successfully
        Disputed,       // In dispute resolution
        Cancelled       // Job cancelled
    }

    enum BidStatus {
        Active,
        Accepted,
        Rejected,
        Withdrawn
    }

    struct Job {
        uint256 id;
        address client;
        address freelancer;
        string title;
        string description;
        string category;
        uint256 budget;
        address paymentToken;
        uint256 deadline;
        JobStatus status;
        string metadataHash; // IPFS hash containing detailed job info
        uint256 escrowId;
        uint256 createdAt;
        uint256 assignedAt;
        uint256 completedAt;
        bool hasEscrow;
        uint256[] skillIds;
    }

    struct Bid {
        uint256 id;
        uint256 jobId;
        address freelancer;
        uint256 amount;
        uint256 deliveryTime; // in days
        string proposalHash; // IPFS hash of proposal
        uint256 stakedAmount;
        BidStatus status;
        uint256 createdAt;
        string portfolioHash; // IPFS hash of portfolio items
    }

    struct JobSkill {
        uint256 skillId;
        string skillName;
        uint256 requiredLevel; // 1-5
        bool isRequired;
    }

    struct Deliverable {
        string title;
        string description;
        string fileHash; // IPFS hash
        uint256 submittedAt;
        bool isApproved;
    }

    // State variables
    UserRegistry public immutable userRegistry;
    EscrowManager public immutable escrowManager;
    DisputeResolution public immutable disputeResolution;
    GovernanceToken public immutable governanceToken;

    mapping(uint256 => Job) public jobs;
    mapping(uint256 => Bid[]) public jobBids;
    mapping(uint256 => mapping(address => bool)) public hasBid;
    mapping(uint256 => JobSkill[]) public jobSkills;
    mapping(uint256 => Deliverable[]) public jobDeliverables;
    mapping(address => uint256[]) public clientJobs;
    mapping(address => uint256[]) public freelancerJobs;
    mapping(address => uint256[]) public userBids;
    
    uint256 public nextJobId = 1;
    uint256 public nextBidId = 1;
    
    // Configuration
    uint256 public constant MIN_BID_STAKE = 50 * 10**18; // 50 tokens
    uint256 public constant MAX_BID_STAKE = 5000 * 10**18; // 5000 tokens
    uint256 public constant MIN_JOB_BUDGET = 0.01 ether; // Minimum budget
    uint256 public constant MAX_JOB_DURATION = 365 days; // Maximum job duration
    uint256 public constant BID_VALIDITY_PERIOD = 30 days;
    
    // Statistics
    uint256 public totalJobs;
    uint256 public completedJobs;
    uint256 public totalBids;
    uint256 public activeJobs;

    // Events
    event JobCreated(
        uint256 indexed jobId,
        address indexed client,
        string title,
        uint256 budget,
        address paymentToken
    );
    event BidSubmitted(
        uint256 indexed bidId,
        uint256 indexed jobId,
        address indexed freelancer,
        uint256 amount,
        uint256 deliveryTime
    );
    event FreelancerSelected(
        uint256 indexed jobId,
        address indexed freelancer,
        uint256 bidAmount
    );
    event WorkSubmitted(
        uint256 indexed jobId,
        address indexed freelancer,
        string deliverableHash
    );
    event WorkApproved(
        uint256 indexed jobId,
        address indexed client,
        address indexed freelancer
    );
    event JobCompleted(
        uint256 indexed jobId,
        address indexed freelancer,
        uint256 amount
    );
    event JobCancelled(
        uint256 indexed jobId,
        address indexed client,
        string reason
    );
    event DisputeRaised(
        uint256 indexed jobId,
        address indexed raisedBy,
        string reason
    );
    event BidWithdrawn(
        uint256 indexed bidId,
        uint256 indexed jobId,
        address indexed freelancer
    );
    event DeadlineExtended(
        uint256 indexed jobId,
        uint256 oldDeadline,
        uint256 newDeadline
    );

    // Errors
    error JobNotFound();
    error BidNotFound();
    error InvalidJobStatus();
    error InvalidBidStatus();
    error NotAuthorized();
    error InvalidAmount();
    error InvalidDeadline();
    error BidAlreadyExists();
    error InsufficientStake();
    error InvalidSkillLevel();
    error DeadlineExceeded();
    error InvalidFreelancer();
    error JobNotAssigned();
    error WorkNotSubmitted();
    error EscrowNotCreated();

    modifier onlyJobClient(uint256 _jobId) {
        if (jobs[_jobId].client != msg.sender) revert NotAuthorized();
        _;
    }

    modifier onlyJobFreelancer(uint256 _jobId) {
        if (jobs[_jobId].freelancer != msg.sender) revert NotAuthorized();
        _;
    }

    modifier onlyJobParticipant(uint256 _jobId) {
        Job storage job = jobs[_jobId];
        if (job.client != msg.sender && job.freelancer != msg.sender) {
            revert NotAuthorized();
        }
        _;
    }

    modifier validJob(uint256 _jobId) {
        if (_jobId == 0 || _jobId >= nextJobId) revert JobNotFound();
        _;
    }

    modifier validJobStatus(uint256 _jobId, JobStatus _status) {
        if (jobs[_jobId].status != _status) revert InvalidJobStatus();
        _;
    }

    constructor(
        address _userRegistry,
        address _escrowManager,
        address _disputeResolution,
        address _governanceToken
    ) {
        userRegistry = UserRegistry(_userRegistry);
        escrowManager = EscrowManager(_escrowManager);
        disputeResolution = DisputeResolution(_disputeResolution);
        governanceToken = GovernanceToken(_governanceToken);
    }

    /**
     * @dev Create a new freelance job
     * @param _title Job title
     * @param _description Job description
     * @param _category Job category
     * @param _budget Job budget
     * @param _paymentToken Payment token address (address(0) for ETH)
     * @param _deadline Job deadline timestamp
     * @param _metadataHash IPFS hash with detailed job information
     * @param _skillIds Array of required skill IDs
     * @param _skillLevels Array of required skill levels
     */
    function createJob(
        string calldata _title,
        string calldata _description,
        string calldata _category,
        uint256 _budget,
        address _paymentToken,
        uint256 _deadline,
        string calldata _metadataHash,
        uint256[] calldata _skillIds,
        uint256[] calldata _skillLevels
    ) external whenNotPaused nonReentrant returns (uint256 jobId) {
        // Validation
        if (_budget < MIN_JOB_BUDGET) revert InvalidAmount();
        if (_deadline <= block.timestamp || _deadline > block.timestamp + MAX_JOB_DURATION) {
            revert InvalidDeadline();
        }
        if (_skillIds.length != _skillLevels.length) revert InvalidSkillLevel();
        
        // Check if user is registered
        (address userAddress,,,,,,,) = userRegistry.users(msg.sender);
        if (userAddress == address(0)) revert NotAuthorized();

        jobId = nextJobId++;

        // Create job
        jobs[jobId] = Job({
            id: jobId,
            client: msg.sender,
            freelancer: address(0),
            title: _title,
            description: _description,
            category: _category,
            budget: _budget,
            paymentToken: _paymentToken,
            deadline: _deadline,
            status: JobStatus.Open,
            metadataHash: _metadataHash,
            escrowId: 0,
            createdAt: block.timestamp,
            assignedAt: 0,
            completedAt: 0,
            hasEscrow: false,
            skillIds: _skillIds
        });

        // Add skills
        for (uint256 i = 0; i < _skillIds.length; i++) {
            if (_skillLevels[i] < 1 || _skillLevels[i] > 5) revert InvalidSkillLevel();
            
            jobSkills[jobId].push(JobSkill({
                skillId: _skillIds[i],
                skillName: "", // Will be fetched from registry
                requiredLevel: _skillLevels[i],
                isRequired: true
            }));
        }

        // Update tracking
        clientJobs[msg.sender].push(jobId);
        totalJobs++;
        activeJobs++;

        emit JobCreated(jobId, msg.sender, _title, _budget, _paymentToken);
    }

    /**
     * @dev Submit a bid for a job
     * @param _jobId Job ID to bid on
     * @param _amount Bid amount
     * @param _deliveryTime Delivery time in days
     * @param _proposalHash IPFS hash of proposal details
     * @param _portfolioHash IPFS hash of portfolio items
     * @param _stakeAmount Amount of tokens to stake
     */
    function submitBid(
        uint256 _jobId,
        uint256 _amount,
        uint256 _deliveryTime,
        string calldata _proposalHash,
        string calldata _portfolioHash,
        uint256 _stakeAmount
    ) external validJob(_jobId) validJobStatus(_jobId, JobStatus.Open) whenNotPaused nonReentrant {
        if (hasBid[_jobId][msg.sender]) revert BidAlreadyExists();
        if (_amount == 0) revert InvalidAmount();
        if (_stakeAmount < MIN_BID_STAKE || _stakeAmount > MAX_BID_STAKE) revert InsufficientStake();
        if (_deliveryTime == 0) revert InvalidAmount();

        Job storage job = jobs[_jobId];
        if (msg.sender == job.client) revert NotAuthorized();
        if (block.timestamp > job.deadline) revert DeadlineExceeded();

        // Check if user is registered and meets requirements
        (address userAddress,,,,,,,) = userRegistry.users(msg.sender);
        if (userAddress == address(0)) revert NotAuthorized();
        
        // Check staking requirement
        if (!userRegistry.meetsStakingRequirement(msg.sender)) revert InsufficientStake();

        // Transfer stake to this contract
        governanceToken.transferFrom(msg.sender, address(this), _stakeAmount);

        uint256 bidId = nextBidId++;

        // Create bid
        Bid memory newBid = Bid({
            id: bidId,
            jobId: _jobId,
            freelancer: msg.sender,
            amount: _amount,
            deliveryTime: _deliveryTime,
            proposalHash: _proposalHash,
            stakedAmount: _stakeAmount,
            status: BidStatus.Active,
            createdAt: block.timestamp,
            portfolioHash: _portfolioHash
        });

        jobBids[_jobId].push(newBid);
        hasBid[_jobId][msg.sender] = true;
        userBids[msg.sender].push(bidId);
        totalBids++;

        emit BidSubmitted(bidId, _jobId, msg.sender, _amount, _deliveryTime);
    }

    /**
     * @dev Select a freelancer for the job
     * @param _jobId Job ID
     * @param _freelancer Address of selected freelancer
     */
    function selectFreelancer(uint256 _jobId, address _freelancer) 
        external 
        payable
        validJob(_jobId) 
        validJobStatus(_jobId, JobStatus.Open)
        onlyJobClient(_jobId) 
        whenNotPaused 
        nonReentrant 
    {
        if (!hasBid[_jobId][_freelancer]) revert BidNotFound();

        Job storage job = jobs[_jobId];
        
        // Find the accepted bid
        Bid storage acceptedBid;
        bool bidFound = false;
        
        for (uint256 i = 0; i < jobBids[_jobId].length; i++) {
            if (jobBids[_jobId][i].freelancer == _freelancer && 
                jobBids[_jobId][i].status == BidStatus.Active) {
                acceptedBid = jobBids[_jobId][i];
                acceptedBid.status = BidStatus.Accepted;
                bidFound = true;
                break;
            }
        }
        
        if (!bidFound) revert BidNotFound();

        // Update job
        job.freelancer = _freelancer;
        job.status = JobStatus.Assigned;
        job.assignedAt = block.timestamp;
        job.budget = acceptedBid.amount; // Update budget to accepted bid amount

        // Create escrow
        uint256 escrowId;
        if (job.paymentToken == address(0)) {
            // ETH payment
            if (msg.value != acceptedBid.amount) revert InvalidAmount();
            escrowId = escrowManager.createEscrow{value: msg.value}(
                _jobId,
                _freelancer,
                address(0),
                acceptedBid.amount,
                ""
            );
        } else {
            // ERC20 payment
            if (msg.value != 0) revert InvalidAmount();
            IERC20(job.paymentToken).safeTransferFrom(msg.sender, address(this), acceptedBid.amount);
            IERC20(job.paymentToken).safeApprove(address(escrowManager), acceptedBid.amount);
            escrowId = escrowManager.createEscrow(
                _jobId,
                _freelancer,
                job.paymentToken,
                acceptedBid.amount,
                ""
            );
        }

        job.escrowId = escrowId;
        job.hasEscrow = true;

        // Update freelancer's job list
        freelancerJobs[_freelancer].push(_jobId);

        // Reject other bids and return stakes
        _rejectOtherBids(_jobId, _freelancer);

        emit FreelancerSelected(_jobId, _freelancer, acceptedBid.amount);
    }

    /**
     * @dev Submit work for a job
     * @param _jobId Job ID
     * @param _deliverables Array of deliverable details
     */
    function submitWork(
        uint256 _jobId,
        Deliverable[] calldata _deliverables
    ) external validJob(_jobId) onlyJobFreelancer(_jobId) whenNotPaused {
        Job storage job = jobs[_jobId];
        if (job.status != JobStatus.Assigned && job.status != JobStatus.InProgress) {
            revert InvalidJobStatus();
        }

        // Add deliverables
        for (uint256 i = 0; i < _deliverables.length; i++) {
            jobDeliverables[_jobId].push(Deliverable({
                title: _deliverables[i].title,
                description: _deliverables[i].description,
                fileHash: _deliverables[i].fileHash,
                submittedAt: block.timestamp,
                isApproved: false
            }));
        }

        job.status = JobStatus.Submitted;

        emit WorkSubmitted(_jobId, msg.sender, _deliverables[0].fileHash);
    }

    /**
     * @dev Approve submitted work and release payment
     * @param _jobId Job ID
     */
    function approveWork(uint256 _jobId) 
        external 
        validJob(_jobId) 
        validJobStatus(_jobId, JobStatus.Submitted)
        onlyJobClient(_jobId) 
        whenNotPaused 
        nonReentrant 
    {
        Job storage job = jobs[_jobId];
        
        if (!job.hasEscrow) revert EscrowNotCreated();

        // Update job status
        job.status = JobStatus.Completed;
        job.completedAt = block.timestamp;

        // Release funds from escrow
        escrowManager.releaseFunds(job.escrowId);

        // Update statistics
        completedJobs++;
        activeJobs--;

        // Update user reputations
        userRegistry.updateReputation(job.freelancer, true);
        userRegistry.updateReputation(job.client, true);

        // Return freelancer's stake
        _returnBidStake(_jobId, job.freelancer);

        emit WorkApproved(_jobId, msg.sender, job.freelancer);
        emit JobCompleted(_jobId, job.freelancer, job.budget);
    }

    /**
     * @dev Raise a dispute for a job
     * @param _jobId Job ID
     * @param _reason Reason for dispute
     * @param _evidence IPFS hash of evidence
     */
    function raiseDispute(
        uint256 _jobId,
        string calldata _reason,
        string calldata _evidence
    ) external validJob(_jobId) onlyJobParticipant(_jobId) whenNotPaused {
        Job storage job = jobs[_jobId];
        
        if (job.status != JobStatus.Submitted && job.status != JobStatus.InProgress && job.status != JobStatus.Assigned) {
            revert InvalidJobStatus();
        }

        job.status = JobStatus.Disputed;

        // Create dispute in dispute resolution contract
        disputeResolution.createDispute(
            _jobId,
            job.escrowId,
            job.client,
            job.freelancer,
            _reason,
            _evidence
        );

        emit DisputeRaised(_jobId, msg.sender, _reason);
    }

    /**
     * @dev Cancel a job (only if not assigned)
     * @param _jobId Job ID
     * @param _reason Reason for cancellation
     */
    function cancelJob(uint256 _jobId, string calldata _reason) 
        external 
        validJob(_jobId) 
        onlyJobClient(_jobId) 
        whenNotPaused 
    {
        Job storage job = jobs[_jobId];
        
        if (job.status != JobStatus.Open) revert InvalidJobStatus();

        job.status = JobStatus.Cancelled;
        activeJobs--;

        // Return all bid stakes
        _returnAllBidStakes(_jobId);

        emit JobCancelled(_jobId, msg.sender, _reason);
    }

    /**
     * @dev Withdraw a bid (only before selection)
     * @param _jobId Job ID
     */
    function withdrawBid(uint256 _jobId) 
        external 
        validJob(_jobId) 
        validJobStatus(_jobId, JobStatus.Open) 
        whenNotPaused 
    {
        if (!hasBid[_jobId][msg.sender]) revert BidNotFound();

        // Find and update bid status
        for (uint256 i = 0; i < jobBids[_jobId].length; i++) {
            if (jobBids[_jobId][i].freelancer == msg.sender && 
                jobBids[_jobId][i].status == BidStatus.Active) {
                
                jobBids[_jobId][i].status = BidStatus.Withdrawn;
                
                // Return stake
                governanceToken.transfer(msg.sender, jobBids[_jobId][i].stakedAmount);
                
                hasBid[_jobId][msg.sender] = false;
                
                emit BidWithdrawn(jobBids[_jobId][i].id, _jobId, msg.sender);
                break;
            }
        }
    }

    /**
     * @dev Extend job deadline (mutual agreement)
     * @param _jobId Job ID
     * @param _newDeadline New deadline timestamp
     */
    function extendDeadline(uint256 _jobId, uint256 _newDeadline) 
        external 
        validJob(_jobId) 
        onlyJobParticipant(_jobId) 
        whenNotPaused 
    {
        Job storage job = jobs[_jobId];
        
        if (_newDeadline <= job.deadline) revert InvalidDeadline();
        if (_newDeadline > block.timestamp + MAX_JOB_DURATION) revert InvalidDeadline();

        uint256 oldDeadline = job.deadline;
        job.deadline = _newDeadline;

        emit DeadlineExtended(_jobId, oldDeadline, _newDeadline);
    }

    /**
     * @dev Internal function to reject other bids and return stakes
     * @param _jobId Job ID
     * @param _selectedFreelancer Address of selected freelancer
     */
    function _rejectOtherBids(uint256 _jobId, address _selectedFreelancer) internal {
        for (uint256 i = 0; i < jobBids[_jobId].length; i++) {
            Bid storage bid = jobBids[_jobId][i];
            if (bid.freelancer != _selectedFreelancer && bid.status == BidStatus.Active) {
                bid.status = BidStatus.Rejected;
                // Return stake
                governanceToken.transfer(bid.freelancer, bid.stakedAmount);
                hasBid[_jobId][bid.freelancer] = false;
            }
        }
    }

    /**
     * @dev Internal function to return bid stake to freelancer
     * @param _jobId Job ID
     * @param _freelancer Freelancer address
     */
    function _returnBidStake(uint256 _jobId, address _freelancer) internal {
        for (uint256 i = 0; i < jobBids[_jobId].length; i++) {
            if (jobBids[_jobId][i].freelancer == _freelancer && 
                jobBids[_jobId][i].status == BidStatus.Accepted) {
                governanceToken.transfer(_freelancer, jobBids[_jobId][i].stakedAmount);
                break;
            }
        }
    }

    /**
     * @dev Internal function to return all bid stakes (when job is cancelled)
     * @param _jobId Job ID
     */
    function _returnAllBidStakes(uint256 _jobId) internal {
        for (uint256 i = 0; i < jobBids[_jobId].length; i++) {
            Bid storage bid = jobBids[_jobId][i];
            if (bid.status == BidStatus.Active) {
                bid.status = BidStatus.Rejected;
                governanceToken.transfer(bid.freelancer, bid.stakedAmount);
                hasBid[_jobId][bid.freelancer] = false;
            }
        }
    }

    // View functions

    /**
     * @dev Get job details
     * @param _jobId Job ID
     * @return job Job details
     */
    function getJob(uint256 _jobId) external view returns (Job memory job) {
        return jobs[_jobId];
    }

    /**
     * @dev Get all bids for a job
     * @param _jobId Job ID
     * @return bids Array of bids
     */
    function getJobBids(uint256 _jobId) external view returns (Bid[] memory bids) {
        return jobBids[_jobId];
    }

    /**
     * @dev Get job skills
     * @param _jobId Job ID
     * @return skills Array of required skills
     */
    function getJobSkills(uint256 _jobId) external view returns (JobSkill[] memory skills) {
        return jobSkills[_jobId];
    }

    /**
     * @dev Get job deliverables
     * @param _jobId Job ID
     * @return deliverables Array of deliverables
     */
    function getJobDeliverables(uint256 _jobId) external view returns (Deliverable[] memory deliverables) {
        return jobDeliverables[_jobId];
    }

    /**
     * @dev Get client's jobs
     * @param _client Client address
     * @return jobIds Array of job IDs
     */
    function getClientJobs(address _client) external view returns (uint256[] memory jobIds) {
        return clientJobs[_client];
    }

    /**
     * @dev Get freelancer's jobs
     * @param _freelancer Freelancer address
     * @return jobIds Array of job IDs
     */
    function getFreelancerJobs(address _freelancer) external view returns (uint256[] memory jobIds) {
        return freelancerJobs[_freelancer];
    }

    /**
     * @dev Get user's bids
     * @param _user User address
     * @return bidIds Array of bid IDs
     */
    function getUserBids(address _user) external view returns (uint256[] memory bidIds) {
        return userBids[_user];
    }

    /**
     * @dev Get platform statistics
     * @return total Total jobs created
     * @return completed Completed jobs
     * @return active Active jobs
     * @return totalBids_ Total bids submitted
     */
    function getPlatformStats() external view returns (
        uint256 total,
        uint256 completed,
        uint256 active,
        uint256 totalBids_
    ) {
        return (totalJobs, completedJobs, activeJobs, totalBids);
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

    /**
     * @dev Emergency token recovery
     * @param _token Token address
     * @param _amount Amount to recover
     */
    function recoverTokens(address _token, uint256 _amount) external onlyOwner {
        if (_token == address(0)) {
            (bool success, ) = owner().call{value: _amount}("");
            require(success, "Transfer failed");
        } else {
            IERC20(_token).safeTransfer(owner(), _amount);
        }
    }

    receive() external payable {
        // Allow contract to receive ETH for escrow funding
    }
}