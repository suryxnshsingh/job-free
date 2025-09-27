import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { deployContractsFixture, advanceTimeAndBlock } from "./setup";

describe("GovernanceToken", function () {
    describe("Deployment", function () {
        it("Should deploy with correct initial parameters", async function () {
            const { governanceToken, owner } = await loadFixture(deployContractsFixture);

            expect(await governanceToken.name()).to.equal("FreelanceDAO");
            expect(await governanceToken.symbol()).to.equal("FDAO");
            expect(await governanceToken.totalSupply()).to.equal(ethers.parseEther("100000000")); // 100M
            expect(await governanceToken.balanceOf(owner.address)).to.equal(ethers.parseEther("100000000"));
            expect(await governanceToken.MAX_SUPPLY()).to.equal(ethers.parseEther("1000000000")); // 1B
        });

        it("Should have correct staking configuration", async function () {
            const { governanceToken } = await loadFixture(deployContractsFixture);

            expect(await governanceToken.MIN_STAKING_PERIOD()).to.equal(30 * 24 * 60 * 60); // 30 days
            expect(await governanceToken.stakingRewardRate()).to.equal(500); // 5% APY
            expect(await governanceToken.BASIS_POINTS()).to.equal(10000);
        });
    });

    describe("Staking", function () {
        it("Should stake tokens successfully", async function () {
            const { governanceToken, user1 } = await loadFixture(deployContractsFixture);

            const stakeAmount = ethers.parseEther("1000");

            await expect(governanceToken.connect(user1).stake(stakeAmount))
                .to.emit(governanceToken, "TokensStaked")
                .withArgs(user1.address, stakeAmount, await ethers.provider.getBlock("latest").then(b => b!.timestamp + 1));

            const stakingInfo = await governanceToken.getStakingInfo(user1.address);
            expect(stakingInfo.amount).to.equal(stakeAmount);
            expect(stakingInfo.pendingRewards).to.equal(0); // No rewards initially
            expect(stakingInfo.canUnstake).to.be.false; // Cannot unstake immediately
        });

        it("Should fail to stake zero amount", async function () {
            const { governanceToken, user1 } = await loadFixture(deployContractsFixture);

            await expect(governanceToken.connect(user1).stake(0))
                .to.be.revertedWithCustomError(governanceToken, "InvalidAmount");
        });

        it("Should fail to stake more than balance", async function () {
            const { governanceToken, user1 } = await loadFixture(deployContractsFixture);

            const userBalance = await governanceToken.balanceOf(user1.address);
            const excessiveAmount = userBalance + ethers.parseEther("1");

            await expect(governanceToken.connect(user1).stake(excessiveAmount))
                .to.be.revertedWithCustomError(governanceToken, "InsufficientBalance");
        });

        it("Should accumulate multiple stakes", async function () {
            const { governanceToken, user1 } = await loadFixture(deployContractsFixture);

            const firstStake = ethers.parseEther("500");
            const secondStake = ethers.parseEther("300");

            await governanceToken.connect(user1).stake(firstStake);
            await governanceToken.connect(user1).stake(secondStake);

            const stakingInfo = await governanceToken.getStakingInfo(user1.address);
            expect(stakingInfo.amount).to.equal(firstStake + secondStake);
        });
    });

    describe("Unstaking", function () {
        it("Should unstake after minimum period", async function () {
            const { governanceToken, user1 } = await loadFixture(deployContractsFixture);

            const stakeAmount = ethers.parseEther("1000");
            await governanceToken.connect(user1).stake(stakeAmount);

            // Advance time by minimum staking period
            await advanceTimeAndBlock(30 * 24 * 60 * 60); // 30 days

            const unstakeAmount = ethers.parseEther("500");
            await expect(governanceToken.connect(user1).unstake(unstakeAmount))
                .to.emit(governanceToken, "TokensUnstaked");

            const stakingInfo = await governanceToken.getStakingInfo(user1.address);
            expect(stakingInfo.amount).to.equal(stakeAmount - unstakeAmount);
        });

        it("Should fail to unstake before minimum period", async function () {
            const { governanceToken, user1 } = await loadFixture(deployContractsFixture);

            const stakeAmount = ethers.parseEther("1000");
            await governanceToken.connect(user1).stake(stakeAmount);

            const unstakeAmount = ethers.parseEther("500");
            await expect(governanceToken.connect(user1).unstake(unstakeAmount))
                .to.be.revertedWithCustomError(governanceToken, "StakingPeriodNotMet");
        });

        it("Should fail to unstake more than staked", async function () {
            const { governanceToken, user1 } = await loadFixture(deployContractsFixture);

            const stakeAmount = ethers.parseEther("1000");
            await governanceToken.connect(user1).stake(stakeAmount);
            await advanceTimeAndBlock(30 * 24 * 60 * 60);

            const excessiveAmount = stakeAmount + ethers.parseEther("1");
            await expect(governanceToken.connect(user1).unstake(excessiveAmount))
                .to.be.revertedWithCustomError(governanceToken, "InsufficientStakedBalance");
        });
    });

    describe("Rewards", function () {
        it("Should calculate rewards correctly", async function () {
            const { governanceToken, user1 } = await loadFixture(deployContractsFixture);

            const stakeAmount = ethers.parseEther("1000");
            await governanceToken.connect(user1).stake(stakeAmount);

            // Advance time by 1 year
            await advanceTimeAndBlock(365 * 24 * 60 * 60);

            const stakingInfo = await governanceToken.getStakingInfo(user1.address);
            
            // Should be approximately 5% APY (50 tokens for 1000 staked)
            // Using a range check due to block time variations
            expect(stakingInfo.pendingRewards).to.be.closeTo(
                ethers.parseEther("50"), 
                ethers.parseEther("1") // 1 token tolerance
            );
        });

        it("Should claim rewards without unstaking", async function () {
            const { governanceToken, user1 } = await loadFixture(deployContractsFixture);

            const stakeAmount = ethers.parseEther("1000");
            await governanceToken.connect(user1).stake(stakeAmount);

            // Advance time by 6 months
            await advanceTimeAndBlock(182 * 24 * 60 * 60);

            const balanceBefore = await governanceToken.balanceOf(user1.address);
            
            await expect(governanceToken.connect(user1).claimRewards())
                .to.emit(governanceToken, "RewardsClaimed");

            const balanceAfter = await governanceToken.balanceOf(user1.address);
            expect(balanceAfter).to.be.gt(balanceBefore);

            // Staked amount should remain the same
            const stakingInfo = await governanceToken.getStakingInfo(user1.address);
            expect(stakingInfo.amount).to.equal(stakeAmount);
        });

        it("Should mint rewards within max supply limit", async function () {
            const { governanceToken, user1 } = await loadFixture(deployContractsFixture);

            // Get close to max supply
            const maxSupply = await governanceToken.MAX_SUPPLY();
            const currentSupply = await governanceToken.totalSupply();
            const remainingSupply = maxSupply - currentSupply;

            // Stake a large amount
            const stakeAmount = ethers.parseEther("100000000"); // 100M tokens
            await governanceToken.transfer(user1.address, stakeAmount);
            await governanceToken.connect(user1).stake(stakeAmount);

            // Advance time significantly
            await advanceTimeAndBlock(365 * 24 * 60 * 60);

            // Claim rewards
            await governanceToken.connect(user1).claimRewards();

            // Total supply should not exceed max supply
            const finalSupply = await governanceToken.totalSupply();
            expect(finalSupply).to.be.lte(maxSupply);
        });
    });

    describe("Emergency Functions", function () {
        it("Should emergency unstake without rewards", async function () {
            const { governanceToken, user1 } = await loadFixture(deployContractsFixture);

            const stakeAmount = ethers.parseEther("1000");
            await governanceToken.connect(user1).stake(stakeAmount);

            const balanceBefore = await governanceToken.balanceOf(user1.address);

            await expect(governanceToken.connect(user1).emergencyUnstake())
                .to.emit(governanceToken, "EmergencyWithdraw")
                .withArgs(user1.address, stakeAmount);

            const balanceAfter = await governanceToken.balanceOf(user1.address);
            expect(balanceAfter).to.equal(balanceBefore + stakeAmount);

            const stakingInfo = await governanceToken.getStakingInfo(user1.address);
            expect(stakingInfo.amount).to.equal(0);
        });
    });

    describe("Platform Statistics", function () {
        it("Should track platform statistics correctly", async function () {
            const { governanceToken, user1, user2 } = await loadFixture(deployContractsFixture);

            const stake1 = ethers.parseEther("1000");
            const stake2 = ethers.parseEther("500");

            await governanceToken.connect(user1).stake(stake1);
            await governanceToken.connect(user2).stake(stake2);

            const stats = await governanceToken.getPlatformStats();
            expect(stats.totalStaked_).to.equal(stake1 + stake2);
            expect(stats.totalSupply_).to.equal(await governanceToken.totalSupply());
        });
    });

    describe("Access Control", function () {
        it("Should allow owner to update reward rate", async function () {
            const { governanceToken, owner } = await loadFixture(deployContractsFixture);

            const newRate = 1000; // 10% APY
            await expect(governanceToken.connect(owner).updateRewardRate(newRate))
                .to.emit(governanceToken, "RewardRateUpdated")
                .withArgs(500, newRate);

            expect(await governanceToken.stakingRewardRate()).to.equal(newRate);
        });

        it("Should fail to update reward rate above maximum", async function () {
            const { governanceToken, owner } = await loadFixture(deployContractsFixture);

            const excessiveRate = 2500; // 25% APY (above 20% max)
            await expect(governanceToken.connect(owner).updateRewardRate(excessiveRate))
                .to.be.revertedWithCustomError(governanceToken, "InvalidRewardRate");
        });

        it("Should fail for non-owner to update reward rate", async function () {
            const { governanceToken, user1 } = await loadFixture(deployContractsFixture);

            await expect(governanceToken.connect(user1).updateRewardRate(1000))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should allow owner to pause/unpause", async function () {
            const { governanceToken, owner, user1 } = await loadFixture(deployContractsFixture);

            // Pause the contract
            await governanceToken.connect(owner).pause();

            // Should fail to stake when paused
            await expect(governanceToken.connect(user1).stake(ethers.parseEther("100")))
                .to.be.revertedWith("Pausable: paused");

            // Unpause the contract
            await governanceToken.connect(owner).unpause();

            // Should work after unpause
            await expect(governanceToken.connect(user1).stake(ethers.parseEther("100")))
                .to.not.be.reverted;
        });
    });

    describe("ERC20 Functionality", function () {
        it("Should support standard ERC20 transfers", async function () {
            const { governanceToken, user1, user2 } = await loadFixture(deployContractsFixture);

            const transferAmount = ethers.parseEther("100");
            const initialBalance = await governanceToken.balanceOf(user1.address);

            await governanceToken.connect(user1).transfer(user2.address, transferAmount);

            expect(await governanceToken.balanceOf(user1.address)).to.equal(initialBalance - transferAmount);
            expect(await governanceToken.balanceOf(user2.address)).to.equal(transferAmount);
        });

        it("Should support ERC20 allowances", async function () {
            const { governanceToken, user1, user2 } = await loadFixture(deployContractsFixture);

            const allowanceAmount = ethers.parseEther("100");

            await governanceToken.connect(user1).approve(user2.address, allowanceAmount);
            expect(await governanceToken.allowance(user1.address, user2.address)).to.equal(allowanceAmount);

            await governanceToken.connect(user2).transferFrom(user1.address, user2.address, allowanceAmount);
            expect(await governanceToken.balanceOf(user2.address)).to.equal(allowanceAmount);
        });
    });

    describe("Governance Features", function () {
        it("Should support delegation", async function () {
            const { governanceToken, user1, user2 } = await loadFixture(deployContractsFixture);

            await governanceToken.connect(user1).delegate(user2.address);
            
            expect(await governanceToken.delegates(user1.address)).to.equal(user2.address);
            expect(await governanceToken.getVotes(user2.address)).to.equal(
                await governanceToken.balanceOf(user1.address)
            );
        });
    });
});