const { ethers } = require("hardhat");

async function checkJobs() {
    const freelanceJob = await ethers.getContractAt("FreelanceJob", "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9");
    
    console.log("🔍 Checking all jobs created...");
    
    try {
        // Get job count
        const totalJobs = await freelanceJob.totalJobs();
        const nextJobId = await freelanceJob.nextJobId();
        console.log(`📊 Total jobs created: ${totalJobs}`);
        console.log(`📊 Next job ID: ${nextJobId}`);
        
        // Check recent jobs
        for (let i = 1; i < nextJobId; i++) {
            try {
                const job = await freelanceJob.jobs(i);
                console.log(`\n📋 Job #${i}:`);
                console.log(`- Title: ${job.title}`);
                console.log(`- Client: ${job.client}`);
                console.log(`- Budget: ${ethers.formatEther(job.budget)} ETH`);
                console.log(`- Status: ${job.status}`);
                console.log(`- Created: ${new Date(Number(job.createdAt) * 1000)}`);
            } catch (error) {
                console.log(`❌ Error reading job ${i}:`, error.message);
            }
        }
        
    } catch (error) {
        console.error("Error:", error.message);
    }
}

checkJobs().catch(console.error);