import { create as createIPFS, IPFSHTTPClient } from 'ipfs-http-client';
import { logger } from '@/config/logger';
import config from '@/config/app';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import axios from 'axios';

interface IPFSFile {
  path: string;
  hash: string;
  size: number;
}

interface IPFSUploadResult {
  hash: string;
  url: string;
  size: number;
}

interface ProfileMetadata {
  name: string;
  bio: string;
  skills: string[];
  experience: string;
  avatar?: string;
  portfolio: {
    title: string;
    description: string;
    images: string[];
    url?: string;
  }[];
  certifications: {
    name: string;
    issuer: string;
    date: string;
    image?: string;
  }[];
}

interface JobMetadata {
  requirements: string[];
  deliverables: string[];
  timeline: {
    phase: string;
    duration: number;
    description: string;
  }[];
  attachments: string[];
  additionalInfo: string;
}

interface ProposalMetadata {
  coverLetter: string;
  timeline: {
    milestone: string;
    duration: number;
    amount: number;
    description: string;
  }[];
  portfolio: string[];
  additionalNotes: string;
}

interface WorkSubmissionMetadata {
  description: string;
  deliverables: {
    title: string;
    description: string;
    files: string[];
  }[];
  notes: string;
  revision?: boolean;
}

export class IPFSService {
  private client: IPFSHTTPClient | null = null;
  private pinataApiKey: string;
  private pinataSecretKey: string;
  private gatewayUrl: string;

  constructor() {
    this.pinataApiKey = config.ipfs.pinataApiKey || '';
    this.pinataSecretKey = config.ipfs.pinataSecretKey || '';
    this.gatewayUrl = config.ipfs.gatewayUrl || 'https://gateway.pinata.cloud/ipfs/';
  }

  async initialize(): Promise<void> {
    try {
      // Initialize IPFS client
      if (config.ipfs.nodeUrl) {
        this.client = createIPFS({
          url: config.ipfs.nodeUrl,
          timeout: 60000,
        });

        // Test connection
        await this.testConnection();
      }

      logger.info('IPFS service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize IPFS service:', error);
      throw error;
    }
  }

  private async testConnection(): Promise<void> {
    if (!this.client) throw new Error('IPFS client not initialized');

    try {
      const version = await this.client.version();
      logger.info('IPFS node connected', { version: version.version });
    } catch (error) {
      logger.error('Failed to connect to IPFS node:', error);
      throw error;
    }
  }

  // Upload file to IPFS using Pinata
  async uploadFile(filePath: string, fileName?: string): Promise<IPFSUploadResult> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));

      if (fileName) {
        formData.append('pinataMetadata', JSON.stringify({
          name: fileName,
        }));
      }

      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'pinata_api_key': this.pinataApiKey,
            'pinata_secret_api_key': this.pinataSecretKey,
          },
          timeout: 120000,
        }
      );

      const result: IPFSUploadResult = {
        hash: response.data.IpfsHash,
        url: `${this.gatewayUrl}${response.data.IpfsHash}`,
        size: response.data.PinSize,
      };

      logger.info('File uploaded to IPFS', {
        hash: result.hash,
        size: result.size,
        fileName: fileName || path.basename(filePath),
      });

      return result;
    } catch (error) {
      logger.error('Error uploading file to IPFS:', error);
      throw error;
    }
  }

  // Upload buffer to IPFS using Pinata
  async uploadBuffer(buffer: Buffer, fileName: string): Promise<IPFSUploadResult> {
    try {
      const formData = new FormData();
      formData.append('file', buffer, { filename: fileName });
      formData.append('pinataMetadata', JSON.stringify({
        name: fileName,
      }));

      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'pinata_api_key': this.pinataApiKey,
            'pinata_secret_api_key': this.pinataSecretKey,
          },
          timeout: 120000,
        }
      );

      const result: IPFSUploadResult = {
        hash: response.data.IpfsHash,
        url: `${this.gatewayUrl}${response.data.IpfsHash}`,
        size: response.data.PinSize,
      };

      logger.info('Buffer uploaded to IPFS', {
        hash: result.hash,
        size: result.size,
        fileName,
      });

      return result;
    } catch (error) {
      logger.error('Error uploading buffer to IPFS:', error);
      throw error;
    }
  }

  // Upload JSON data to IPFS
  async uploadJSON(data: any, fileName?: string): Promise<IPFSUploadResult> {
    try {
      const jsonBuffer = Buffer.from(JSON.stringify(data, null, 2));
      const name = fileName || `data_${Date.now()}.json`;
      
      return await this.uploadBuffer(jsonBuffer, name);
    } catch (error) {
      logger.error('Error uploading JSON to IPFS:', error);
      throw error;
    }
  }

  // Upload user profile metadata
  async uploadProfileMetadata(profileData: ProfileMetadata): Promise<string> {
    try {
      const result = await this.uploadJSON(profileData, `profile_${Date.now()}.json`);
      return result.hash;
    } catch (error) {
      logger.error('Error uploading profile metadata:', error);
      throw error;
    }
  }

  // Upload job metadata
  async uploadJobMetadata(jobData: JobMetadata): Promise<string> {
    try {
      const result = await this.uploadJSON(jobData, `job_${Date.now()}.json`);
      return result.hash;
    } catch (error) {
      logger.error('Error uploading job metadata:', error);
      throw error;
    }
  }

  // Upload proposal metadata
  async uploadProposalMetadata(proposalData: ProposalMetadata): Promise<string> {
    try {
      const result = await this.uploadJSON(proposalData, `proposal_${Date.now()}.json`);
      return result.hash;
    } catch (error) {
      logger.error('Error uploading proposal metadata:', error);
      throw error;
    }
  }

  // Upload work submission metadata
  async uploadWorkSubmissionMetadata(workData: WorkSubmissionMetadata): Promise<string> {
    try {
      const result = await this.uploadJSON(workData, `work_${Date.now()}.json`);
      return result.hash;
    } catch (error) {
      logger.error('Error uploading work submission metadata:', error);
      throw error;
    }
  }

  // Retrieve data from IPFS
  async retrieveData(hash: string): Promise<any> {
    try {
      // Try Pinata gateway first
      try {
        const response = await axios.get(`${this.gatewayUrl}${hash}`, {
          timeout: 30000,
        });
        return response.data;
      } catch (gatewayError) {
        logger.warn('Pinata gateway failed, trying IPFS client', { hash });
      }

      // Fallback to local IPFS client
      if (this.client) {
        const chunks = [];
        for await (const chunk of this.client.cat(hash)) {
          chunks.push(chunk);
        }
        const data = Buffer.concat(chunks);
        
        try {
          return JSON.parse(data.toString());
        } catch {
          return data;
        }
      }

      throw new Error('No IPFS retrieval method available');
    } catch (error) {
      logger.error('Error retrieving data from IPFS:', error);
      throw error;
    }
  }

  // Pin content to ensure it stays available
  async pinContent(hash: string): Promise<void> {
    try {
      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinByHash',
        {
          hashToPin: hash,
        },
        {
          headers: {
            'pinata_api_key': this.pinataApiKey,
            'pinata_secret_api_key': this.pinataSecretKey,
          },
        }
      );

      logger.info('Content pinned successfully', { hash });
    } catch (error) {
      logger.error('Error pinning content:', error);
      throw error;
    }
  }

  // Unpin content to save storage
  async unpinContent(hash: string): Promise<void> {
    try {
      await axios.delete(`https://api.pinata.cloud/pinning/unpin/${hash}`, {
        headers: {
          'pinata_api_key': this.pinataApiKey,
          'pinata_secret_api_key': this.pinataSecretKey,
        },
      });

      logger.info('Content unpinned successfully', { hash });
    } catch (error) {
      logger.error('Error unpinning content:', error);
      throw error;
    }
  }

  // Get pin list
  async getPinList(): Promise<any[]> {
    try {
      const response = await axios.get('https://api.pinata.cloud/data/pinList', {
        headers: {
          'pinata_api_key': this.pinataApiKey,
          'pinata_secret_api_key': this.pinataSecretKey,
        },
      });

      return response.data.rows;
    } catch (error) {
      logger.error('Error getting pin list:', error);
      throw error;
    }
  }

  // Upload multiple files and return their hashes
  async uploadMultipleFiles(files: { path: string; name?: string }[]): Promise<IPFSUploadResult[]> {
    try {
      const uploadPromises = files.map(file => 
        this.uploadFile(file.path, file.name)
      );

      const results = await Promise.all(uploadPromises);
      
      logger.info('Multiple files uploaded to IPFS', {
        count: results.length,
        totalSize: results.reduce((sum, result) => sum + result.size, 0),
      });

      return results;
    } catch (error) {
      logger.error('Error uploading multiple files to IPFS:', error);
      throw error;
    }
  }

  // Get file info without downloading
  async getFileInfo(hash: string): Promise<{ size: number; type: string }> {
    try {
      const response = await axios.head(`${this.gatewayUrl}${hash}`, {
        timeout: 10000,
      });

      return {
        size: parseInt(response.headers['content-length'] || '0', 10),
        type: response.headers['content-type'] || 'unknown',
      };
    } catch (error) {
      logger.error('Error getting file info:', error);
      throw error;
    }
  }

  // Validate IPFS hash
  isValidHash(hash: string): boolean {
    // IPFS v0 hash (Qm...)
    const v0Pattern = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
    // IPFS v1 hash (bafy...)
    const v1Pattern = /^bafy[a-z0-9]{55}$/;
    
    return v0Pattern.test(hash) || v1Pattern.test(hash);
  }

  // Generate IPFS URL from hash
  generateUrl(hash: string): string {
    if (!this.isValidHash(hash)) {
      throw new Error('Invalid IPFS hash');
    }
    return `${this.gatewayUrl}${hash}`;
  }

  // Cleanup
  async destroy(): Promise<void> {
    try {
      if (this.client) {
        // IPFS client cleanup is automatic
        this.client = null;
      }
      logger.info('IPFS service destroyed');
    } catch (error) {
      logger.error('Error destroying IPFS service:', error);
    }
  }
}

export default IPFSService;