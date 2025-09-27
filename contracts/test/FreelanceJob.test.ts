import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { 
    deployContractsFixture, 
    setupRegisteredUsers, 
    createSampleJob, 
    submitBidToJob,
    testConstants,
    expectEvent,
    advanceTimeAndBlock 
} from "./setup";

describe("FreelanceJob", function () {
    describe("Deployment", function () {
        it("Should deploy with correct dependencies", async function () {
            const { freelanceJob, userRegistry, escrowManager, disputeResolution, governanceToken } = 
                await loadFixture(deployContractsFixture);

            expect(await freelanceJob.userRegistry()).to.equal(await userRegistry.getAddress());
            expect(await freelanceJob.escrowManager()).to.equal(await escrowManager.getAddress());
            expect(await freelanceJob.disputeResolution()).to.equal(await disputeResolution.getAddress());
            expect(await freelanceJob.governanceToken()).to.equal(await governanceToken.getAddress());
        });

        it("Should have correct initial state", async function () {
            const { freelanceJob } = await loadFixture(deployContractsFixture);

            expect(await freelanceJob.nextJobId()).to.equal(1);
            expect(await freelanceJob.nextBidId()).to.equal(1);
            expect(await freelanceJob.totalJobs()).to.equal(0);
            expect(await freelanceJob.activeJobs()).to.equal(0);
        });
    });

    describe("Job Creation", function () {
        it("Should create a job successfully", async function () {
            const contracts = await loadFixture(deployContractsFixture);
            await setupRegisteredUsers(contracts);

            const { freelanceJob, client } = contracts;

            const jobData = {
                title: "Build a DApp",
                description: "Need a React developer for blockchain integration",
                category: "Development",
                budget: ethers.parseEther("1"),
                paymentToken: ethers.ZeroAddress,
                deadline: Math.floor(Date.now() / 1000) + 86400 * 7,
                metadataHash: "QmJobMetadata123",
                skillIds: [1, 2],
                skillLevels: [4, 3],
            };

            await expect(freelanceJob.connect(client).createJob(
                jobData.title,
                jobData.description,
                jobData.category,
                jobData.budget,
                jobData.paymentToken,
                jobData.deadline,
                jobData.metadataHash,
                jobData.skillIds,
                jobData.skillLevels
            )).to.emit(freelanceJob, "JobCreated")
              .withArgs(1, client.address, jobData.title, jobData.budget, jobData.paymentToken);

            const job = await freelanceJob.getJob(1);
            expect(job.id).to.equal(1);
            expect(job.client).to.equal(client.address);
            expect(job.title).to.equal(jobData.title);
            expect(job.budget).to.equal(jobData.budget);
            expect(job.status).to.equal(0); // JobStatus.Open
        });

        it("Should fail with invalid budget", async function () {
            const contracts = await loadFixture(deployContractsFixture);
            await setupRegisteredUsers(contracts);

            const { freelanceJob, client } = contracts;

            await expect(freelanceJob.connect(client).createJob(
                "Test Job",
                "Description",
                "Development",
                ethers.parseEther("0.005"), // Below minimum
                ethers.ZeroAddress,
                Math.floor(Date.now() / 1000) + 86400,
                "QmTest",
                [1],
                [3]
            )).to.be.revertedWithCustomError(freelanceJob, "InvalidAmount");
        });

        it("Should fail with invalid deadline", async function () {
            const contracts = await loadFixture(deployContractsFixture);
            await setupRegisteredUsers(contracts);

            const { freelanceJob, client } = contracts;

            const pastDeadline = Math.floor(Date.now() / 1000) - 86400; // 1 day ago

            await expect(freelanceJob.connect(client).createJob(
                "Test Job",
                "Description",
                "Development",
                ethers.parseEther("1"),
                ethers.ZeroAddress,
                pastDeadline,
                "QmTest",
                [1],
                [3]
            )).to.be.revertedWithCustomError(freelanceJob, "InvalidDeadline");
        });

        it("Should fail for unregistered user", async function () {
            const { freelanceJob, user1 } = await loadFixture(deployContractsFixture);

            await expect(freelanceJob.connect(user1).createJob(
                "Test Job",
                "Description",
                "Development",
                ethers.parseEther("1"),
                ethers.ZeroAddress,
                Math.floor(Date.now() / 1000) + 86400,
                "QmTest",
                [1],
                [3]
            )).to.be.revertedWithCustomError(freelanceJob, "NotAuthorized");
        });

        it("Should track job skills correctly", async function () {
            const contracts = await loadFixture(deployContractsFixture);
            await setupRegisteredUsers(contracts);

            const jobId = await createSampleJob(contracts);
            const skills = await contracts.freelanceJob.getJobSkills(jobId);

            expect(skills.length).to.equal(2);
            expect(skills[0].skillId).to.equal(1);
            expect(skills[0].requiredLevel).to.equal(4);
            expect(skills[1].skillId).to.equal(2);
            expect(skills[1].requiredLevel).to.equal(3);
        });
    });

    describe("Bidding System", function () {
        it("Should submit bid successfully", async function () {
            const contracts = await loadFixture(deployContractsFixture);
            await setupRegisteredUsers(contracts);

            const jobId = await createSampleJob(contracts);
            const { freelanceJob, freelancer, governanceToken } = contracts;

            const bidData = {
                amount: ethers.parseEther("0.8"),
                deliveryTime: 5,
                proposalHash: "QmProposalHash123",
                portfolioHash: "QmPortfolioHash123",
                stakeAmount: ethers.parseEther("100"),
            };

            await governanceToken.connect(freelancer).approve(
                await freelanceJob.getAddress(), 
                bidData.stakeAmount
            );

            await expect(freelanceJob.connect(freelancer).submitBid(
                jobId,
                bidData.amount,
                bidData.deliveryTime,
                bidData.proposalHash,
                bidData.portfolioHash,
                bidData.stakeAmount
            )).to.emit(freelanceJob, "BidSubmitted");

            const bids = await freelanceJob.getJobBids(jobId);
            expect(bids.length).to.equal(1);
            expect(bids[0].freelancer).to.equal(freelancer.address);
            expect(bids[0].amount).to.equal(bidData.amount);
            expect(bids[0].status).to.equal(0); // BidStatus.Active
        });

        it("Should fail to bid on own job", async function () {
            const contracts = await loadFixture(deployContractsFixture);
            await setupRegisteredUsers(contracts);

            const jobId = await createSampleJob(contracts);
            const { freelanceJob, client, governanceToken } = contracts;

            await governanceToken.connect(client).approve(
                await freelanceJob.getAddress(), 
                ethers.parseEther("100")
            );

            await expect(freelanceJob.connect(client).submitBid(
                jobId,
                ethers.parseEther("0.8"),
                5,
                "QmProposal",
                "QmPortfolio",
                ethers.parseEther("100")
            )).to.be.revertedWithCustomError(freelanceJob, "NotAuthorized");
        });

        it("Should fail to submit duplicate bid", async function () {
            const contracts = await loadFixture(deployContractsFixture);
            await setupRegisteredUsers(contracts);

            const jobId = await createSampleJob(contracts);
            await submitBidToJob(contracts, jobId, contracts.freelancer);

            // Try to submit another bid
            const { freelanceJob, freelancer, governanceToken } = contracts;

            await governanceToken.connect(freelancer).approve(
                await freelanceJob.getAddress(), 
                ethers.parseEther("100")
            );

            await expect(freelanceJob.connect(freelancer).submitBid(
                jobId,
                ethers.parseEther("0.9"),
                4,
                "QmProposal2",
                "QmPortfolio2",
                ethers.parseEther("100")
            )).to.be.revertedWithCustomError(freelanceJob, "BidAlreadyExists");
        });

        it("Should fail with insufficient stake", async function () {
            const contracts = await loadFixture(deployContractsFixture);
            await setupRegisteredUsers(contracts);

            const jobId = await createSampleJob(contracts);
            const { freelanceJob, freelancer, governanceToken } = contracts;

            const insufficientStake = ethers.parseEther("10"); // Below minimum

            await governanceToken.connect(freelancer).approve(
                await freelanceJob.getAddress(), 
                insufficientStake
            );

            await expect(freelanceJob.connect(freelancer).submitBid(
                jobId,
                ethers.parseEther("0.8"),
                5,
                "QmProposal",
                "QmPortfolio",
                insufficientStake
            )).to.be.revertedWithCustomError(freelanceJob, "InsufficientStake");
        });

        it("Should allow bid withdrawal", async function () {
            const contracts = await loadFixture(deployContractsFixture);
            await setupRegisteredUsers(contracts);

            const jobId = await createSampleJob(contracts);
            await submitBidToJob(contracts, jobId, contracts.freelancer);

            const { freelanceJob, freelancer, governanceToken } = contracts;
            const balanceBefore = await governanceToken.balanceOf(freelancer.address);

            await expect(freelanceJob.connect(freelancer).withdrawBid(jobId))
                .to.emit(freelanceJob, "BidWithdrawn");

            const balanceAfter = await governanceToken.balanceOf(freelancer.address);
            expect(balanceAfter).to.equal(balanceBefore + ethers.parseEther("100")); // Stake returned

            expect(await freelanceJob.hasBid(jobId, freelancer.address)).to.be.false;
        });
    });

    describe("Freelancer Selection", function () {
        it("Should select freelancer successfully", async function () {
            const contracts = await loadFixture(deployContractsFixture);
            await setupRegisteredUsers(contracts);

            const jobId = await createSampleJob(contracts);
            await submitBidToJob(contracts, jobId, contracts.freelancer);

            const { freelanceJob, client, freelancer } = contracts;
            const bidAmount = ethers.parseEther("0.8");

            await expect(freelanceJob.connect(client).selectFreelancer(jobId, freelancer.address, {
                value: bidAmount
            })).to.emit(freelanceJob, "FreelancerSelected")
              .withArgs(jobId, freelancer.address, bidAmount);

            const job = await freelanceJob.getJob(jobId);
            expect(job.freelancer).to.equal(freelancer.address);
            expect(job.status).to.equal(1); // JobStatus.Assigned
            expect(job.hasEscrow).to.be.true;
            expect(job.escrowId).to.be.gt(0);
        });

        it("Should fail for non-client", async function () {
            const contracts = await loadFixture(deployContractsFixture);
            await setupRegisteredUsers(contracts);

            const jobId = await createSampleJob(contracts);
            await submitBidToJob(contracts, jobId, contracts.freelancer);

            const { freelanceJob, freelancer } = contracts;

            await expect(freelanceJob.connect(freelancer).selectFreelancer(jobId, freelancer.address, {
                value: ethers.parseEther("0.8")
            })).to.be.revertedWithCustomError(freelanceJob, "NotAuthorized");
        });

        it("Should fail with incorrect payment amount", async function () {
            const contracts = await loadFixture(deployContractsFixture);
            await setupRegisteredUsers(contracts);

            const jobId = await createSampleJob(contracts);
            await submitBidToJob(contracts, jobId, contracts.freelancer);

            const { freelanceJob, client, freelancer } = contracts;

            await expect(freelanceJob.connect(client).selectFreelancer(jobId, freelancer.address, {
                value: ethers.parseEther("0.5") // Wrong amount
            })).to.be.revertedWithCustomError(freelanceJob, "InvalidAmount");
        });

        it("Should reject other bids when selecting freelancer", async function () {
            const contracts = await loadFixture(deployContractsFixture);
            await setupRegisteredUsers(contracts);

            const jobId = await createSampleJob(contracts);
            
            // Submit multiple bids
            await submitBidToJob(contracts, jobId, contracts.freelancer);
            await submitBidToJob(contracts, jobId, contracts.arbitrator1);

            const { freelanceJob, client, freelancer, arbitrator1, governanceToken } = contracts;
            
            const arbitratorBalanceBefore = await governanceToken.balanceOf(arbitrator1.address);

            await freelanceJob.connect(client).selectFreelancer(jobId, freelancer.address, {
                value: ethers.parseEther("0.8")
            });

            // Check that other bids were rejected and stakes returned
            const arbitratorBalanceAfter = await governanceToken.balanceOf(arbitrator1.address);
            expect(arbitratorBalanceAfter).to.equal(arbitratorBalanceBefore + ethers.parseEther("100"));

            const bids = await freelanceJob.getJobBids(jobId);
            const rejectedBid = bids.find(bid => bid.freelancer === arbitrator1.address);
            expect(rejectedBid?.status).to.equal(2); // BidStatus.Rejected
        });
    });

    describe("Work Submission and Approval", function () {
        async function setupJobWithFreelancer(contracts: any) {
            const jobId = await createSampleJob(contracts);
            await submitBidToJob(contracts, jobId, contracts.freelancer);
            
            await contracts.freelanceJob.connect(contracts.client).selectFreelancer(
                jobId, 
                contracts.freelancer.address, 
                { value: ethers.parseEther("0.8") }
            );
            
            return jobId;
        }

        it("Should submit work successfully", async function () {
            const contracts = await loadFixture(deployContractsFixture);
            await setupRegisteredUsers(contracts);

            const jobId = await setupJobWithFreelancer(contracts);
            const { freelanceJob, freelancer } = contracts;

            const deliverables = [{
                title: "Completed DApp",
                description: "Fully functional decentralized application",
                fileHash: "QmDeliverableHash123",
                submittedAt: 0,
                isApproved: false
            }];

            await expect(freelanceJob.connect(freelancer).submitWork(jobId, deliverables))
                .to.emit(freelanceJob, "WorkSubmitted")
                .withArgs(jobId, freelancer.address, deliverables[0].fileHash);

            const job = await freelanceJob.getJob(jobId);
            expect(job.status).to.equal(3); // JobStatus.Submitted

            const jobDeliverables = await freelanceJob.getJobDeliverables(jobId);
            expect(jobDeliverables.length).to.equal(1);
            expect(jobDeliverables[0].title).to.equal(deliverables[0].title);
        });

        it("Should approve work and complete job", async function () {
            const contracts = await loadFixture(deployContractsFixture);
            await setupRegisteredUsers(contracts);

            const jobId = await setupJobWithFreelancer(contracts);
            const { freelanceJob, client, freelancer, governanceToken } = contracts;

            // Submit work
            const deliverables = [{
                title: "Completed DApp",
                description: "Fully functional decentralized application",
                fileHash: "QmDeliverableHash123",
                submittedAt: 0,
                isApproved: false
            }];

            await freelanceJob.connect(freelancer).submitWork(jobId, deliverables);

            const freelancerBalanceBefore = await ethers.provider.getBalance(freelancer.address);
            const stakeBalanceBefore = await governanceToken.balanceOf(freelancer.address);

            await expect(freelanceJob.connect(client).approveWork(jobId))
                .to.emit(freelanceJob, "WorkApproved")
                .withArgs(jobId, client.address, freelancer.address)
                .and.to.emit(freelanceJob, "JobCompleted")
                .withArgs(jobId, freelancer.address, ethers.parseEther("0.8"));

            // Check job completion
            const job = await freelanceJob.getJob(jobId);
            expect(job.status).to.equal(4); // JobStatus.Completed
            expect(job.completedAt).to.be.gt(0);

            // Check payment was released (freelancer received ETH)
            const freelancerBalanceAfter = await ethers.provider.getBalance(freelancer.address);
            expect(freelancerBalanceAfter).to.be.gt(freelancerBalanceBefore);

            // Check stake was returned
            const stakeBalanceAfter = await governanceToken.balanceOf(freelancer.address);
            expect(stakeBalanceAfter).to.equal(stakeBalanceBefore + ethers.parseEther("100"));

            // Check statistics
            expect(await freelanceJob.completedJobs()).to.equal(1);
            expect(await freelanceJob.activeJobs()).to.equal(0);
        });

        it("Should fail to approve if not client", async function () {
            const contracts = await loadFixture(deployContractsFixture);
            await setupRegisteredUsers(contracts);

            const jobId = await setupJobWithFreelancer(contracts);
            const { freelanceJob, freelancer } = contracts;

            // Submit work
            const deliverables = [{
                title: "Completed DApp",
                description: "Fully functional decentralized application",
                fileHash: "QmDeliverableHash123",
                submittedAt: 0,
                isApproved: false
            }];

            await freelanceJob.connect(freelancer).submitWork(jobId, deliverables);

            await expect(freelanceJob.connect(freelancer).approveWork(jobId))
                .to.be.revertedWithCustomError(freelanceJob, "NotAuthorized");
        });
    });

    describe("Job Cancellation", function () {
        it("Should cancel open job successfully", async function () {
            const contracts = await loadFixture(deployContractsFixture);
            await setupRegisteredUsers(contracts);

            const jobId = await createSampleJob(contracts);
            await submitBidToJob(contracts, jobId, contracts.freelancer);

            const { freelanceJob, client, freelancer, governanceToken } = contracts;
            const freelancerBalanceBefore = await governanceToken.balanceOf(freelancer.address);

            const reason = "Project requirements changed";
            await expect(freelanceJob.connect(client).cancelJob(jobId, reason))
                .to.emit(freelanceJob, "JobCancelled")
                .withArgs(jobId, client.address, reason);

            const job = await freelanceJob.getJob(jobId);
            expect(job.status).to.equal(6); // JobStatus.Cancelled

            // Check that bid stakes were returned
            const freelancerBalanceAfter = await governanceToken.balanceOf(freelancer.address);
            expect(freelancerBalanceAfter).to.equal(freelancerBalanceBefore + ethers.parseEther("100"));

            expect(await freelanceJob.activeJobs()).to.equal(0);
        });

        it("Should fail to cancel assigned job", async function () {
            const contracts = await loadFixture(deployContractsFixture);
            await setupRegisteredUsers(contracts);

            const jobId = await createSampleJob(contracts);
            await submitBidToJob(contracts, jobId, contracts.freelancer);

            const { freelanceJob, client, freelancer } = contracts;

            // Select freelancer first
            await freelanceJob.connect(client).selectFreelancer(jobId, freelancer.address, {
                value: ethers.parseEther("0.8")
            });

            await expect(freelanceJob.connect(client).cancelJob(jobId, "Changed mind"))
                .to.be.revertedWithCustomError(freelanceJob, "InvalidJobStatus");
        });
    });

    describe("Dispute Handling", function () {
        async function setupJobWithWork(contracts: any) {
            const jobId = await createSampleJob(contracts);
            await submitBidToJob(contracts, jobId, contracts.freelancer);
            
            await contracts.freelanceJob.connect(contracts.client).selectFreelancer(
                jobId, 
                contracts.freelancer.address, 
                { value: ethers.parseEther("0.8") }
            );

            const deliverables = [{
                title: "Completed DApp",
                description: "Fully functional decentralized application",
                fileHash: "QmDeliverableHash123",
                submittedAt: 0,
                isApproved: false
            }];

            await contracts.freelanceJob.connect(contracts.freelancer).submitWork(jobId, deliverables);
            
            return jobId;
        }

        it("Should raise dispute successfully", async function () {
            const contracts = await loadFixture(deployContractsFixture);
            await setupRegisteredUsers(contracts);

            const jobId = await setupJobWithWork(contracts);
            const { freelanceJob, client, governanceToken } = contracts;

            // Approve tokens for dispute fee
            await governanceToken.connect(client).approve(
                await contracts.disputeResolution.getAddress(),
                ethers.parseEther("100")
            );

            const reason = "Work quality is not acceptable";
            const evidence = "QmEvidenceHash123";

            await expect(freelanceJob.connect(client).raiseDispute(jobId, reason, evidence))
                .to.emit(freelanceJob, "DisputeRaised")
                .withArgs(jobId, client.address, reason);

            const job = await freelanceJob.getJob(jobId);
            expect(job.status).to.equal(5); // JobStatus.Disputed
        });

        it("Should fail for non-participant", async function () {
            const contracts = await loadFixture(deployContractsFixture);
            await setupRegisteredUsers(contracts);

            const jobId = await setupJobWithWork(contracts);
            const { freelanceJob, user1 } = contracts;

            await expect(freelanceJob.connect(user1).raiseDispute(jobId, "Reason", "Evidence"))
                .to.be.revertedWithCustomError(freelanceJob, "NotAuthorized");
        });
    });

    describe("Platform Statistics", function () {
        it("Should track platform statistics correctly", async function () {
            const contracts = await loadFixture(deployContractsFixture);
            await setupRegisteredUsers(contracts);

            // Create and complete a job
            const jobId = await createSampleJob(contracts);
            await submitBidToJob(contracts, jobId, contracts.freelancer);

            await contracts.freelanceJob.connect(contracts.client).selectFreelancer(
                jobId, 
                contracts.freelancer.address, 
                { value: ethers.parseEther("0.8") }
            );

            const deliverables = [{
                title: "Completed DApp",
                description: "Fully functional decentralized application",
                fileHash: "QmDeliverableHash123",
                submittedAt: 0,
                isApproved: false
            }];

            await contracts.freelanceJob.connect(contracts.freelancer).submitWork(jobId, deliverables);
            await contracts.freelanceJob.connect(contracts.client).approveWork(jobId);

            const stats = await contracts.freelanceJob.getPlatformStats();
            expect(stats.total).to.equal(1);
            expect(stats.completed).to.equal(1);
            expect(stats.active).to.equal(0);
            expect(stats.totalBids_).to.equal(1);
        });
    });

    describe("Access Control and Security", function () {
        it("Should pause and unpause correctly", async function () {
            const contracts = await loadFixture(deployContractsFixture);
            await setupRegisteredUsers(contracts);

            const { freelanceJob, owner, client } = contracts;

            await freelanceJob.connect(owner).pause();

            await expect(freelanceJob.connect(client).createJob(
                "Test Job",
                "Description",
                "Development",
                ethers.parseEther("1"),
                ethers.ZeroAddress,
                Math.floor(Date.now() / 1000) + 86400,
                "QmTest",
                [1],
                [3]
            )).to.be.revertedWith("Pausable: paused");

            await freelanceJob.connect(owner).unpause();

            await expect(freelanceJob.connect(client).createJob(
                "Test Job",
                "Description",
                "Development",
                ethers.parseEther("1"),
                ethers.ZeroAddress,
                Math.floor(Date.now() / 1000) + 86400,
                "QmTest",
                [1],
                [3]
            )).to.not.be.reverted;
        });

        it("Should handle emergency token recovery", async function () {
            const contracts = await loadFixture(deployContractsFixture);
            const { freelanceJob, owner, governanceToken } = contracts;

            // Send some tokens to the contract
            const amount = ethers.parseEther("100");
            await governanceToken.transfer(await freelanceJob.getAddress(), amount);

            const ownerBalanceBefore = await governanceToken.balanceOf(owner.address);

            await freelanceJob.connect(owner).recoverTokens(
                await governanceToken.getAddress(),
                amount
            );

            const ownerBalanceAfter = await governanceToken.balanceOf(owner.address);
            expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + amount);
        });
    });
});