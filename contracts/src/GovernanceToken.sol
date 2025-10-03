// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title GovernanceToken
 * @dev ERC20 token with governance capabilities, staking rewards, and security features
 * @author FreelanceDAO Team
 */
contract GovernanceToken is ERC20, ERC20Permit, ERC20Votes, Ownable, Pausable, ReentrancyGuard {
    // Token constants
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1B tokens
    uint256 public constant INITIAL_SUPPLY = 100_000_000 * 10**18; // 100M tokens
    
    // Staking configuration
    uint256 public constant MIN_STAKING_PERIOD = 30 days;
    uint256 public constant MAX_STAKING_PERIOD = 365 days;
    uint256 public stakingRewardRate = 500; // 5% APY (500 basis points)
    uint256 public constant BASIS_POINTS = 10000;
    
    // Staking data structures
    struct StakeInfo {
        uint256 amount;
        uint256 timestamp;
        uint256 rewardRate;
        uint256 lastClaimTime;
    }
    
    mapping(address => StakeInfo) public stakingBalances;
    mapping(address => uint256) public totalStaked;
    
    uint256 public totalStakedSupply;
    uint256 public totalRewardsDistributed;
    
    // Events
    event TokensStaked(address indexed user, uint256 amount, uint256 timestamp);
    event TokensUnstaked(address indexed user, uint256 amount, uint256 rewards);
    event RewardsClaimed(address indexed user, uint256 amount);
    event RewardRateUpdated(uint256 oldRate, uint256 newRate);
    event EmergencyWithdraw(address indexed user, uint256 amount);

    // Errors
    error InvalidAmount();
    error InsufficientBalance();
    error InsufficientStakedBalance();
    error StakingPeriodNotMet();
    error MaxSupplyExceeded();
    error ZeroAddress();
    error InvalidRewardRate();

    constructor() 
        ERC20("FreelanceDAO", "FDAO") 
        ERC20Permit("FreelanceDAO") 
    {
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    /**
     * @dev Stake tokens to earn rewards
     * @param amount Amount of tokens to stake
     */
    function stake(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert InvalidAmount();
        if (balanceOf(msg.sender) < amount) revert InsufficientBalance();

        // If user already has stake, claim rewards first
        if (stakingBalances[msg.sender].amount > 0) {
            _claimRewards(msg.sender);
        }

        // Transfer tokens to contract
        _transfer(msg.sender, address(this), amount);

        // Update staking info
        stakingBalances[msg.sender] = StakeInfo({
            amount: stakingBalances[msg.sender].amount + amount,
            timestamp: block.timestamp,
            rewardRate: stakingRewardRate,
            lastClaimTime: block.timestamp
        });

        totalStaked[msg.sender] += amount;
        totalStakedSupply += amount;

        emit TokensStaked(msg.sender, amount, block.timestamp);
    }

    /**
     * @dev Unstake tokens and claim rewards
     * @param amount Amount of tokens to unstake
     */
    function unstake(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert InvalidAmount();
        if (stakingBalances[msg.sender].amount < amount) revert InsufficientStakedBalance();
        
        // Check minimum staking period
        if (block.timestamp < stakingBalances[msg.sender].timestamp + MIN_STAKING_PERIOD) {
            revert StakingPeriodNotMet();
        }

        // Calculate and mint rewards
        uint256 rewards = _calculateRewards(msg.sender);
        if (rewards > 0) {
            _mintRewards(msg.sender, rewards);
            totalRewardsDistributed += rewards;
            emit RewardsClaimed(msg.sender, rewards);
        }

        // Update staking info
        stakingBalances[msg.sender].amount -= amount;
        stakingBalances[msg.sender].lastClaimTime = block.timestamp;
        
        totalStaked[msg.sender] -= amount;
        totalStakedSupply -= amount;

        // Transfer tokens back to user
        _transfer(address(this), msg.sender, amount);

        emit TokensUnstaked(msg.sender, amount, rewards);
    }

    /**
     * @dev Claim staking rewards without unstaking
     */
    function claimRewards() external nonReentrant whenNotPaused {
        _claimRewards(msg.sender);
    }

    /**
     * @dev Internal function to claim rewards
     * @param user Address of the user claiming rewards
     */
    function _claimRewards(address user) internal {
        uint256 rewards = _calculateRewards(user);
        
        if (rewards > 0) {
            stakingBalances[user].lastClaimTime = block.timestamp;
            _mintRewards(user, rewards);
            totalRewardsDistributed += rewards;
            emit RewardsClaimed(user, rewards);
        }
    }

    /**
     * @dev Calculate pending rewards for a user
     * @param user Address of the user
     * @return rewards Pending reward amount
     */
    function calculateRewards(address user) external view returns (uint256 rewards) {
        return _calculateRewards(user);
    }

    /**
     * @dev Internal function to calculate rewards
     * @param user Address of the user
     * @return rewards Calculated reward amount
     */
    function _calculateRewards(address user) internal view returns (uint256 rewards) {
        StakeInfo storage stakeInfo = stakingBalances[user];
        
        if (stakeInfo.amount == 0) {
            return 0;
        }

        uint256 stakingDuration = block.timestamp - stakeInfo.lastClaimTime;
        
        // Calculate rewards: (stakedAmount * rewardRate * duration) / (365 days * BASIS_POINTS)
        rewards = (stakeInfo.amount * stakeInfo.rewardRate * stakingDuration) / 
                 (365 days * BASIS_POINTS);
    }

    /**
     * @dev Mint reward tokens (only callable internally)
     * @param to Address to mint rewards to
     * @param amount Amount of rewards to mint
     */
    function _mintRewards(address to, uint256 amount) internal {
        if (totalSupply() + amount > MAX_SUPPLY) {
            amount = MAX_SUPPLY - totalSupply();
        }
        
        if (amount > 0) {
            _mint(to, amount);
        }
    }

    /**
     * @dev Emergency unstake function (no rewards, no time lock)
     * Can be used in emergency situations or by owner
     */
    function emergencyUnstake() external nonReentrant {
        uint256 stakedAmount = stakingBalances[msg.sender].amount;
        if (stakedAmount == 0) revert InsufficientStakedBalance();

        // Reset staking info
        stakingBalances[msg.sender] = StakeInfo(0, 0, 0, 0);
        totalStaked[msg.sender] = 0;
        totalStakedSupply -= stakedAmount;

        // Transfer tokens back without rewards
        _transfer(address(this), msg.sender, stakedAmount);

        emit EmergencyWithdraw(msg.sender, stakedAmount);
    }

    /**
     * @dev Update staking reward rate (only owner)
     * @param newRate New reward rate in basis points
     */
    function updateRewardRate(uint256 newRate) external onlyOwner {
        if (newRate > 2000) revert InvalidRewardRate(); // Max 20% APY
        
        uint256 oldRate = stakingRewardRate;
        stakingRewardRate = newRate;
        
        emit RewardRateUpdated(oldRate, newRate);
    }

    /**
     * @dev Pause the contract (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the contract (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Get detailed staking information for a user
     * @param user Address of the user
     * @return amount Staked amount
     * @return timestamp Staking timestamp
     * @return rewardRate Reward rate when staked
     * @return pendingRewards Current pending rewards
     * @return canUnstake Whether user can unstake (time lock met)
     */
    function getStakingInfo(address user) 
        external 
        view 
        returns (
            uint256 amount,
            uint256 timestamp,
            uint256 rewardRate,
            uint256 pendingRewards,
            bool canUnstake
        ) 
    {
        StakeInfo storage stakeInfo = stakingBalances[user];
        
        amount = stakeInfo.amount;
        timestamp = stakeInfo.timestamp;
        rewardRate = stakeInfo.rewardRate;
        pendingRewards = _calculateRewards(user);
        canUnstake = block.timestamp >= stakeInfo.timestamp + MIN_STAKING_PERIOD;
    }

    /**
     * @dev Get platform statistics
     * @return totalSupply_ Current total supply
     * @return totalStaked_ Total tokens staked
     * @return totalRewards Total rewards distributed
     * @return currentAPY Current APY in basis points
     */
    function getPlatformStats() 
        external 
        view 
        returns (
            uint256 totalSupply_,
            uint256 totalStaked_,
            uint256 totalRewards,
            uint256 currentAPY
        ) 
    {
        totalSupply_ = totalSupply();
        totalStaked_ = totalStakedSupply;
        totalRewards = totalRewardsDistributed;
        currentAPY = stakingRewardRate;
    }

    // Override required by Solidity for multiple inheritance
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._burn(account, amount);
    }
}