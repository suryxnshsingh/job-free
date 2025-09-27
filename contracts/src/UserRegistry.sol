// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./GovernanceToken.sol";

/**
 * @title UserRegistry
 * @dev Manages user profiles, reputation, and staking for the freelancing platform
 * @author FreelanceDAO Team
 */
contract UserRegistry is Ownable, Pausable, ReentrancyGuard {
    
    // User types
    enum UserType { Client, Freelancer, Both }
    
    // User profile structure
    struct User {
        address userAddress;
        string profileHash; // IPFS hash containing profile data
        UserType userType;
        uint256 reputation; // Reputation score (0-1000)
        uint256 totalJobs;
        uint256 successfulJobs;
        uint256 stakedAmount;
        uint256 stakingTimestamp;
        bool isActive;
        bool isVerified;
        uint256 joinedAt;
    }
    
    // Skill structure
    struct Skill {
        string name;
        uint256 level; // 1-5 skill level
        uint256 verifications; // Number of verifications
        bool isVerified;
    }
    
    // Rating structure for reputation calculation
    struct Rating {
        address ratedBy;
        uint256 score; // 1-5 stars
        string comment;
        uint256 timestamp;
        uint256 jobId; // Reference to job if applicable
    }

    // State variables
    GovernanceToken public immutable governanceToken;
    
    mapping(address => User) public users;
    mapping(address => Skill[]) public userSkills;
    mapping(address => Rating[]) public userRatings;
    mapping(address => mapping(address => bool)) public hasRated;
    mapping(string => bool) public skillExists;
    mapping(uint256 => bool) public jobRatingExists;
    
    // Configuration
    uint256 public constant MIN_STAKE_AMOUNT = 100 * 10**18; // 100 tokens
    uint256 public constant MAX_STAKE_AMOUNT = 100000 * 10**18; // 100k tokens
    uint256 public constant REPUTATION_DECIMALS = 1000; // Max reputation score
    uint256 public constant MIN_STAKING_PERIOD = 30 days;
    
    // Statistics
    uint256 public totalUsers;
    uint256 public totalFreelancers;
    uint256 public totalClients;
    uint256 public totalStakedInRegistry;
    
    // Events
    event UserRegistered(address indexed user, UserType userType, string profileHash);
    event ProfileUpdated(address indexed user, string newProfileHash);
    event SkillAdded(address indexed user, string skillName, uint256 level);
    event SkillVerified(address indexed user, string skillName, address verifiedBy);
    event UserRated(address indexed ratedUser, address indexed ratedBy, uint256 score, uint256 jobId);
    event ReputationUpdated(address indexed user, uint256 oldReputation, uint256 newReputation);
    event TokensStaked(address indexed user, uint256 amount);
    event TokensUnstaked(address indexed user, uint256 amount);
    event UserVerified(address indexed user, address verifiedBy);
    event UserSuspended(address indexed user, string reason);
    event UserReinstated(address indexed user);

    // Errors
    error UserAlreadyExists();
    error UserNotFound();
    error InvalidUserType();
    error InvalidStakeAmount();
    error InsufficientStake();
    error StakingPeriodNotMet();
    error SkillNotFound();
    error AlreadyRated();
    error InvalidRating();
    error SelfRating();
    error UnauthorizedOperation();
    error InvalidProfileHash();

    constructor(address _governanceToken) {
        if (_governanceToken == address(0)) revert UnauthorizedOperation();
        governanceToken = GovernanceToken(_governanceToken);
    }

    /**
     * @dev Register a new user
     * @param _userType Type of user (Client, Freelancer, Both)
     * @param _profileHash IPFS hash containing profile data
     */
    function registerUser(UserType _userType, string calldata _profileHash) 
        external 
        whenNotPaused 
    {
        if (users[msg.sender].userAddress != address(0)) revert UserAlreadyExists();
        if (bytes(_profileHash).length == 0) revert InvalidProfileHash();

        users[msg.sender] = User({
            userAddress: msg.sender,
            profileHash: _profileHash,
            userType: _userType,
            reputation: 500, // Start with neutral reputation
            totalJobs: 0,
            successfulJobs: 0,
            stakedAmount: 0,
            stakingTimestamp: 0,
            isActive: true,
            isVerified: false,
            joinedAt: block.timestamp
        });

        // Update statistics
        totalUsers++;
        if (_userType == UserType.Client || _userType == UserType.Both) {
            totalClients++;
        }
        if (_userType == UserType.Freelancer || _userType == UserType.Both) {
            totalFreelancers++;
        }

        emit UserRegistered(msg.sender, _userType, _profileHash);
    }

    /**
     * @dev Update user profile
     * @param _profileHash New IPFS hash containing updated profile data
     */
    function updateProfile(string calldata _profileHash) external whenNotPaused {
        if (users[msg.sender].userAddress == address(0)) revert UserNotFound();
        if (bytes(_profileHash).length == 0) revert InvalidProfileHash();

        users[msg.sender].profileHash = _profileHash;
        
        emit ProfileUpdated(msg.sender, _profileHash);
    }

    /**
     * @dev Add a skill to user profile
     * @param _skillName Name of the skill
     * @param _level Skill level (1-5)
     */
    function addSkill(string calldata _skillName, uint256 _level) external whenNotPaused {
        if (users[msg.sender].userAddress == address(0)) revert UserNotFound();
        if (_level < 1 || _level > 5) revert InvalidRating();

        // Check if skill already exists for user
        Skill[] storage skills = userSkills[msg.sender];
        for (uint256 i = 0; i < skills.length; i++) {
            if (keccak256(bytes(skills[i].name)) == keccak256(bytes(_skillName))) {
                skills[i].level = _level;
                emit SkillAdded(msg.sender, _skillName, _level);
                return;
            }
        }

        // Add new skill
        userSkills[msg.sender].push(Skill({
            name: _skillName,
            level: _level,
            verifications: 0,
            isVerified: false
        }));

        skillExists[_skillName] = true;
        
        emit SkillAdded(msg.sender, _skillName, _level);
    }

    /**
     * @dev Stake tokens to improve reputation and platform standing
     * @param _amount Amount of tokens to stake
     */
    function stakeTokens(uint256 _amount) external nonReentrant whenNotPaused {
        if (users[msg.sender].userAddress == address(0)) revert UserNotFound();
        if (_amount < MIN_STAKE_AMOUNT) revert InvalidStakeAmount();
        if (_amount > MAX_STAKE_AMOUNT) revert InvalidStakeAmount();

        // Transfer tokens from user to this contract
        bool success = governanceToken.transferFrom(msg.sender, address(this), _amount);
        if (!success) revert InsufficientStake();

        users[msg.sender].stakedAmount += _amount;
        users[msg.sender].stakingTimestamp = block.timestamp;
        totalStakedInRegistry += _amount;

        emit TokensStaked(msg.sender, _amount);
    }

    /**
     * @dev Unstake tokens after minimum period
     * @param _amount Amount of tokens to unstake
     */
    function unstakeTokens(uint256 _amount) external nonReentrant whenNotPaused {
        User storage user = users[msg.sender];
        if (user.userAddress == address(0)) revert UserNotFound();
        if (_amount > user.stakedAmount) revert InsufficientStake();
        if (block.timestamp < user.stakingTimestamp + MIN_STAKING_PERIOD) {
            revert StakingPeriodNotMet();
        }

        user.stakedAmount -= _amount;
        totalStakedInRegistry -= _amount;

        // Transfer tokens back to user
        bool success = governanceToken.transfer(msg.sender, _amount);
        if (!success) revert InsufficientStake();

        emit TokensUnstaked(msg.sender, _amount);
    }

    /**
     * @dev Rate a user after job completion
     * @param _user Address of user to rate
     * @param _score Rating score (1-5)
     * @param _comment Rating comment
     * @param _jobId Associated job ID
     */
    function rateUser(
        address _user, 
        uint256 _score, 
        string calldata _comment,
        uint256 _jobId
    ) external whenNotPaused {
        if (users[_user].userAddress == address(0)) revert UserNotFound();
        if (_user == msg.sender) revert SelfRating();
        if (_score < 1 || _score > 5) revert InvalidRating();
        if (hasRated[msg.sender][_user] && jobRatingExists[_jobId]) revert AlreadyRated();

        // Add rating
        userRatings[_user].push(Rating({
            ratedBy: msg.sender,
            score: _score,
            comment: _comment,
            timestamp: block.timestamp,
            jobId: _jobId
        }));

        hasRated[msg.sender][_user] = true;
        if (_jobId > 0) {
            jobRatingExists[_jobId] = true;
        }

        // Update reputation
        _updateReputation(_user);

        emit UserRated(_user, msg.sender, _score, _jobId);
    }

    /**
     * @dev Update user reputation based on ratings and job success
     * @param _user Address of user to update
     * @param _successful Whether the job was successful
     */
    function updateReputation(address _user, bool _successful) external whenNotPaused {
        // This should be called by job contract
        if (users[_user].userAddress == address(0)) revert UserNotFound();

        User storage user = users[_user];
        user.totalJobs++;
        
        if (_successful) {
            user.successfulJobs++;
        }

        _updateReputation(_user);
    }

    /**
     * @dev Internal function to calculate and update reputation
     * @param _user Address of user
     */
    function _updateReputation(address _user) internal {
        User storage user = users[_user];
        uint256 oldReputation = user.reputation;
        
        // Base reputation from job success rate
        uint256 successRate = user.totalJobs > 0 ? 
            (user.successfulJobs * 100) / user.totalJobs : 50;

        // Calculate average rating
        Rating[] storage ratings = userRatings[_user];
        uint256 averageRating = 300; // Default neutral rating
        
        if (ratings.length > 0) {
            uint256 totalRating = 0;
            for (uint256 i = 0; i < ratings.length; i++) {
                totalRating += ratings[i].score;
            }
            averageRating = (totalRating * 200) / ratings.length; // Scale to 0-1000
        }

        // Stake bonus (up to 100 points)
        uint256 stakeBonus = user.stakedAmount >= MIN_STAKE_AMOUNT ? 
            (user.stakedAmount * 100) / MAX_STAKE_AMOUNT : 0;
        if (stakeBonus > 100) stakeBonus = 100;

        // Calculate final reputation (weighted average)
        uint256 newReputation = 
            (successRate * 40 / 100) + // 40% from success rate
            (averageRating * 50 / 100) + // 50% from ratings
            (stakeBonus * 10 / 100); // 10% from staking

        // Ensure reputation stays within bounds
        if (newReputation > REPUTATION_DECIMALS) {
            newReputation = REPUTATION_DECIMALS;
        }

        user.reputation = newReputation;

        emit ReputationUpdated(_user, oldReputation, newReputation);
    }

    /**
     * @dev Verify a user (admin function)
     * @param _user Address of user to verify
     */
    function verifyUser(address _user) external onlyOwner {
        if (users[_user].userAddress == address(0)) revert UserNotFound();
        
        users[_user].isVerified = true;
        
        emit UserVerified(_user, msg.sender);
    }

    /**
     * @dev Suspend a user (admin function)
     * @param _user Address of user to suspend
     * @param _reason Reason for suspension
     */
    function suspendUser(address _user, string calldata _reason) external onlyOwner {
        if (users[_user].userAddress == address(0)) revert UserNotFound();
        
        users[_user].isActive = false;
        
        emit UserSuspended(_user, _reason);
    }

    /**
     * @dev Reinstate a suspended user (admin function)
     * @param _user Address of user to reinstate
     */
    function reinstateUser(address _user) external onlyOwner {
        if (users[_user].userAddress == address(0)) revert UserNotFound();
        
        users[_user].isActive = true;
        
        emit UserReinstated(_user);
    }

    /**
     * @dev Get user skills
     * @param _user Address of user
     * @return skills Array of user skills
     */
    function getUserSkills(address _user) external view returns (Skill[] memory skills) {
        return userSkills[_user];
    }

    /**
     * @dev Get user ratings
     * @param _user Address of user
     * @return ratings Array of user ratings
     */
    function getUserRatings(address _user) external view returns (Rating[] memory ratings) {
        return userRatings[_user];
    }

    /**
     * @dev Get user reputation details
     * @param _user Address of user
     * @return reputation Current reputation score
     * @return totalJobs Total number of jobs
     * @return successfulJobs Number of successful jobs
     * @return averageRating Average rating from reviews
     * @return totalRatings Total number of ratings received
     */
    function getReputationDetails(address _user) 
        external 
        view 
        returns (
            uint256 reputation,
            uint256 totalJobs,
            uint256 successfulJobs,
            uint256 averageRating,
            uint256 totalRatings
        ) 
    {
        User storage user = users[_user];
        Rating[] storage ratings = userRatings[_user];
        
        reputation = user.reputation;
        totalJobs = user.totalJobs;
        successfulJobs = user.successfulJobs;
        totalRatings = ratings.length;
        
        if (totalRatings > 0) {
            uint256 totalScore = 0;
            for (uint256 i = 0; i < ratings.length; i++) {
                totalScore += ratings[i].score;
            }
            averageRating = totalScore / totalRatings;
        } else {
            averageRating = 0;
        }
    }

    /**
     * @dev Check if user meets staking requirements
     * @param _user Address of user to check
     * @return meetsRequirement Whether user meets minimum staking requirement
     */
    function meetsStakingRequirement(address _user) external view returns (bool meetsRequirement) {
        return users[_user].stakedAmount >= MIN_STAKE_AMOUNT;
    }

    /**
     * @dev Get platform statistics
     * @return totalUsers_ Total registered users
     * @return totalFreelancers_ Total freelancers
     * @return totalClients_ Total clients
     * @return totalStaked Total tokens staked in registry
     */
    function getPlatformStats() 
        external 
        view 
        returns (
            uint256 totalUsers_,
            uint256 totalFreelancers_,
            uint256 totalClients_,
            uint256 totalStaked
        ) 
    {
        return (totalUsers, totalFreelancers, totalClients, totalStakedInRegistry);
    }

    /**
     * @dev Pause the contract
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
}