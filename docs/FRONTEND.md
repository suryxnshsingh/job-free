# Frontend Architecture Documentation

## 🎨 UI/UX Design System

The frontend is built with modern web technologies to provide a seamless, responsive experience similar to established job platforms like Upwork and Fiverr, but with Web3 integration.

## 🛠️ Technology Stack

### Core Framework
- **Next.js 14**: App Router, Server Components, Streaming
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Shadcn/ui**: High-quality component library

### Web3 Integration
- **Wagmi**: React hooks for Web3
- **Viem**: TypeScript Ethereum library
- **ConnectKit**: Wallet connection UI
- **SIWE**: Sign-In with Ethereum

### State Management
- **Zustand**: Lightweight state management
- **TanStack Query**: Server state management
- **React Hook Form**: Form state management

### Additional Libraries
- **Framer Motion**: Animations
- **React Dropzone**: File uploads
- **Date-fns**: Date manipulation
- **Zod**: Schema validation

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   ├── jobs/
│   │   │   ├── proposals/
│   │   │   ├── contracts/
│   │   │   └── profile/
│   │   ├── browse/
│   │   ├── job/
│   │   │   └── [id]/
│   │   ├── freelancer/
│   │   │   └── [id]/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── loading.tsx
│   │   ├── not-found.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/                 # Shadcn/ui components
│   │   ├── web3/              # Web3-specific components
│   │   ├── forms/             # Form components
│   │   ├── layout/            # Layout components
│   │   ├── job/               # Job-related components
│   │   ├── freelancer/        # Freelancer components
│   │   └── common/            # Shared components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utility functions
│   ├── store/                 # Zustand stores
│   ├── types/                 # TypeScript types
│   ├── constants/             # App constants
│   └── utils/                 # Helper functions
├── public/
│   ├── icons/
│   ├── images/
│   └── logos/
├── tailwind.config.js
├── next.config.js
└── package.json
```

## 🎨 Design System

### Color Palette
```css
:root {
  /* Primary Colors */
  --primary-50: #eff6ff;
  --primary-500: #3b82f6;
  --primary-600: #2563eb;
  --primary-700: #1d4ed8;

  /* Secondary Colors */
  --secondary-50: #f8fafc;
  --secondary-500: #64748b;
  --secondary-600: #475569;

  /* Success/Error States */
  --success-500: #10b981;
  --error-500: #ef4444;
  --warning-500: #f59e0b;

  /* Blockchain-specific */
  --ethereum-color: #627eea;
  --polygon-color: #8247e5;
  --bitcoin-color: #f7931a;
}
```

### Typography Scale
```css
.text-xs { font-size: 0.75rem; line-height: 1rem; }
.text-sm { font-size: 0.875rem; line-height: 1.25rem; }
.text-base { font-size: 1rem; line-height: 1.5rem; }
.text-lg { font-size: 1.125rem; line-height: 1.75rem; }
.text-xl { font-size: 1.25rem; line-height: 1.75rem; }
.text-2xl { font-size: 1.5rem; line-height: 2rem; }
.text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
```

### Component Variants
```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary-600 text-white hover:bg-primary-700",
        destructive: "bg-red-500 text-white hover:bg-red-600",
        outline: "border border-gray-300 bg-white hover:bg-gray-50",
        secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
        ghost: "hover:bg-gray-100",
        link: "text-primary-600 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

## 🧩 Component Architecture

### Core Components

#### 1. Layout Components

**Header Component**
```typescript
// components/layout/Header.tsx
interface HeaderProps {
  user?: User;
  isConnected: boolean;
}

export function Header({ user, isConnected }: HeaderProps) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Logo />
          <Navigation />
          <div className="flex items-center space-x-4">
            <NotificationBell />
            <WalletConnection />
            <UserMenu user={user} />
          </div>
        </div>
      </div>
    </header>
  );
}
```

**Sidebar Navigation**
```typescript
// components/layout/Sidebar.tsx
const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Browse Jobs', href: '/browse', icon: BriefcaseIcon },
  { name: 'My Jobs', href: '/jobs', icon: FolderIcon },
  { name: 'Proposals', href: '/proposals', icon: DocumentTextIcon },
  { name: 'Contracts', href: '/contracts', icon: ClipboardListIcon },
  { name: 'Earnings', href: '/earnings', icon: CurrencyDollarIcon },
];

export function Sidebar() {
  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
      <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white">
        <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
          <nav className="mt-5 flex-1 space-y-1 px-2">
            {navigationItems.map((item) => (
              <SidebarItem key={item.name} {...item} />
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
```

#### 2. Web3 Components

**Wallet Connection**
```typescript
// components/web3/WalletConnection.tsx
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { ConnectKitButton } from 'connectkit';

export function WalletConnection() {
  return (
    <ConnectKitButton.Custom>
      {({ isConnected, show, truncatedAddress, ensName }) => {
        return (
          <Button
            onClick={show}
            variant={isConnected ? "outline" : "default"}
            className="relative"
          >
            {isConnected ? (
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>{ensName ?? truncatedAddress}</span>
              </div>
            ) : (
              "Connect Wallet"
            )}
          </Button>
        );
      }}
    </ConnectKitButton.Custom>
  );
}
```

**Network Switcher**
```typescript
// components/web3/NetworkSwitcher.tsx
import { useNetwork, useSwitchNetwork } from 'wagmi';

const supportedNetworks = [
  { id: 1, name: 'Ethereum', icon: '/icons/ethereum.svg' },
  { id: 137, name: 'Polygon', icon: '/icons/polygon.svg' },
  { id: 11155111, name: 'Sepolia', icon: '/icons/ethereum.svg' },
];

export function NetworkSwitcher() {
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <img src={chain?.iconUrl} alt={chain?.name} className="h-4 w-4" />
          <span className="ml-2">{chain?.name}</span>
          <ChevronDownIcon className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {supportedNetworks.map((network) => (
          <DropdownMenuItem
            key={network.id}
            onClick={() => switchNetwork?.(network.id)}
          >
            <img src={network.icon} alt={network.name} className="h-4 w-4" />
            <span className="ml-2">{network.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

#### 3. Job Components

**Job Card**
```typescript
// components/job/JobCard.tsx
interface JobCardProps {
  job: Job;
  variant?: 'default' | 'compact' | 'detailed';
  showActions?: boolean;
}

export function JobCard({ job, variant = 'default', showActions = true }: JobCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold">
              <Link href={`/job/${job.id}`} className="hover:text-primary-600">
                {job.title}
              </Link>
            </CardTitle>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>Posted {formatDistanceToNow(job.createdAt)} ago</span>
              <Badge variant="secondary">{job.category}</Badge>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-green-600">
              {formatTokenAmount(job.budget, job.paymentToken)}
            </div>
            <div className="text-sm text-gray-500">
              {job.paymentToken === ZERO_ADDRESS ? 'ETH' : job.paymentToken}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <p className="text-gray-700 line-clamp-3">{job.description}</p>
        
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Deadline:</span>
            <span>{format(job.deadline, 'MMM dd, yyyy')}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Proposals:</span>
            <span>{job.bidCount} submitted</span>
          </div>
        </div>
        
        {job.skills && (
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              {job.skills.map((skill) => (
                <Badge key={skill} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      
      {showActions && (
        <CardFooter className="flex justify-between">
          <Button variant="outline" size="sm">
            <HeartIcon className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button size="sm">
            View Details
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
```

**Job Creation Form**
```typescript
// components/job/JobCreationForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const jobSchema = z.object({
  title: z.string().min(10).max(100),
  description: z.string().min(50).max(5000),
  category: z.string(),
  budget: z.number().min(0.01),
  paymentToken: z.string(),
  deadline: z.date().min(new Date()),
  skills: z.array(z.string()).min(1).max(10),
  attachments: z.array(z.any()).optional(),
});

type JobFormData = z.infer<typeof jobSchema>;

export function JobCreationForm() {
  const form = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      budget: 0,
      paymentToken: ZERO_ADDRESS,
      skills: [],
    },
  });

  const { mutate: createJob, isLoading } = useCreateJob();

  const onSubmit = async (data: JobFormData) => {
    try {
      // Upload files to IPFS
      const ipfsHash = await uploadToIPFS({
        ...data,
        attachments: data.attachments || [],
      });

      // Create job on blockchain
      createJob({
        ...data,
        ipfsHash,
      });
    } catch (error) {
      toast.error('Failed to create job');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Job Title</FormLabel>
              <FormControl>
                <Input
                  placeholder="I need a React developer for..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Job Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe your project in detail..."
                  className="min-h-32"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {JOB_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paymentToken"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Token</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment token" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SUPPORTED_TOKENS.map((token) => (
                      <SelectItem key={token.address} value={token.address}>
                        <div className="flex items-center space-x-2">
                          <img src={token.icon} alt={token.symbol} className="h-4 w-4" />
                          <span>{token.symbol}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="budget"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Budget</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="deadline"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Deadline</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <SkillSelector
          selectedSkills={form.watch('skills')}
          onSkillsChange={(skills) => form.setValue('skills', skills)}
        />

        <FileUploader
          onFilesChange={(files) => form.setValue('attachments', files)}
          maxFiles={5}
          maxSize={10 * 1024 * 1024} // 10MB
        />

        <div className="flex justify-end space-x-4">
          <Button variant="outline" type="button">
            Save Draft
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Post Job'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

#### 4. Proposal Components

**Proposal Card**
```typescript
// components/proposal/ProposalCard.tsx
interface ProposalCardProps {
  proposal: Proposal;
  onAccept?: () => void;
  onReject?: () => void;
  showActions?: boolean;
}

export function ProposalCard({ proposal, onAccept, onReject, showActions }: ProposalCardProps) {
  return (
    <Card className="relative">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={proposal.freelancer.avatar} />
              <AvatarFallback>
                {proposal.freelancer.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">
                <Link href={`/freelancer/${proposal.freelancer.id}`}>
                  {proposal.freelancer.name}
                </Link>
              </h3>
              <div className="flex items-center space-x-2">
                <StarRating rating={proposal.freelancer.rating} size="sm" />
                <span className="text-sm text-gray-500">
                  ({proposal.freelancer.reviewCount} reviews)
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-green-600">
              {formatTokenAmount(proposal.amount, proposal.paymentToken)}
            </div>
            <div className="text-sm text-gray-500">
              in {proposal.deliveryTime} days
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <p className="text-gray-700">{proposal.coverLetter}</p>
          
          {proposal.portfolio && proposal.portfolio.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Portfolio Samples</h4>
              <div className="grid grid-cols-3 gap-2">
                {proposal.portfolio.slice(0, 3).map((item, index) => (
                  <div key={index} className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Submitted {formatDistanceToNow(proposal.createdAt)} ago</span>
            <div className="flex items-center space-x-2">
              <LockClosedIcon className="h-4 w-4" />
              <span>Staked: {formatTokenAmount(proposal.stakedAmount)}</span>
            </div>
          </div>
        </div>
      </CardContent>

      {showActions && (
        <CardFooter className="flex justify-between">
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <MessageSquareIcon className="h-4 w-4 mr-2" />
              Message
            </Button>
            <Button variant="outline" size="sm">
              View Profile
            </Button>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={onReject}>
              Decline
            </Button>
            <Button size="sm" onClick={onAccept}>
              Accept Proposal
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
```

#### 5. Dashboard Components

**Dashboard Stats**
```typescript
// components/dashboard/DashboardStats.tsx
interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    trend: 'up' | 'down' | 'neutral';
  };
  icon?: React.ReactNode;
}

function StatCard({ title, value, change, icon }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            {change && (
              <div className={cn(
                "flex items-center text-sm",
                change.trend === 'up' ? 'text-green-600' : 
                change.trend === 'down' ? 'text-red-600' : 'text-gray-600'
              )}>
                {change.trend === 'up' ? (
                  <ArrowUpIcon className="h-4 w-4 mr-1" />
                ) : change.trend === 'down' ? (
                  <ArrowDownIcon className="h-4 w-4 mr-1" />
                ) : null}
                <span>{Math.abs(change.value)}% from last month</span>
              </div>
            )}
          </div>
          {icon && (
            <div className="p-3 bg-primary-50 rounded-lg">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardStats({ userType }: { userType: 'client' | 'freelancer' }) {
  const { data: stats } = useUserStats();

  if (userType === 'freelancer') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Active Projects"
          value={stats?.activeJobs || 0}
          icon={<BriefcaseIcon className="h-6 w-6 text-primary-600" />}
        />
        <StatCard
          title="Total Earnings"
          value={`$${stats?.totalEarnings?.toLocaleString() || 0}`}
          change={{ value: 12, trend: 'up' }}
          icon={<CurrencyDollarIcon className="h-6 w-6 text-green-600" />}
        />
        <StatCard
          title="Success Rate"
          value={`${stats?.successRate || 0}%`}
          icon={<CheckCircleIcon className="h-6 w-6 text-blue-600" />}
        />
        <StatCard
          title="Rating"
          value={stats?.rating || 0}
          icon={<StarIcon className="h-6 w-6 text-yellow-500" />}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Posted Jobs"
        value={stats?.postedJobs || 0}
        icon={<DocumentPlusIcon className="h-6 w-6 text-primary-600" />}
      />
      <StatCard
        title="Total Spent"
        value={`$${stats?.totalSpent?.toLocaleString() || 0}`}
        change={{ value: 8, trend: 'up' }}
        icon={<CurrencyDollarIcon className="h-6 w-6 text-red-600" />}
      />
      <StatCard
        title="Completed Projects"
        value={stats?.completedJobs || 0}
        icon={<CheckCircleIcon className="h-6 w-6 text-green-600" />}
      />
      <StatCard
        title="Active Contracts"
        value={stats?.activeContracts || 0}
        icon={<ClipboardListIcon className="h-6 w-6 text-blue-600" />}
      />
    </div>
  );
}
```

## 🎣 Custom Hooks

### Web3 Hooks

```typescript
// hooks/useContract.ts
import { useContract, useProvider, useSigner } from 'wagmi';
import { CONTRACT_ADDRESSES } from '@/constants/contracts';
import { FREELANCE_JOB_ABI } from '@/abis/FreelanceJob';

export function useFreelanceJobContract() {
  const { data: signer } = useSigner();
  const provider = useProvider();

  return useContract({
    address: CONTRACT_ADDRESSES.FREELANCE_JOB,
    abi: FREELANCE_JOB_ABI,
    signerOrProvider: signer || provider,
  });
}

// hooks/useJobActions.ts
export function useCreateJob() {
  const contract = useFreelanceJobContract();
  const { address } = useAccount();

  return useMutation({
    mutationFn: async (jobData: CreateJobParams) => {
      if (!contract || !address) throw new Error('Not connected');

      const tx = await contract.createJob(
        jobData.title,
        jobData.description,
        jobData.category,
        parseEther(jobData.budget.toString()),
        jobData.paymentToken,
        Math.floor(jobData.deadline.getTime() / 1000),
        jobData.ipfsHash
      );

      return tx.wait();
    },
    onSuccess: () => {
      toast.success('Job created successfully!');
      queryClient.invalidateQueries(['jobs']);
    },
    onError: (error) => {
      toast.error('Failed to create job');
    },
  });
}
```

### Data Fetching Hooks

```typescript
// hooks/useJobs.ts
export function useJobs(filters?: JobFilters) {
  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: () => api.jobs.getJobs(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ['job', id],
    queryFn: () => api.jobs.getJob(id),
    enabled: !!id,
  });
}

// hooks/useProposals.ts
export function useProposals(jobId?: string) {
  return useQuery({
    queryKey: ['proposals', jobId],
    queryFn: () => api.proposals.getProposals(jobId),
    enabled: !!jobId,
  });
}
```

## 🏪 State Management

### Zustand Stores

```typescript
// store/authStore.ts
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (address: string, signature: string) => Promise<void>;
  logout: () => void;
  updateProfile: (profile: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (address, signature) => {
    set({ isLoading: true });
    try {
      const user = await api.auth.login(address, signature);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    set({ user: null, isAuthenticated: false });
    localStorage.removeItem('token');
  },

  updateProfile: (profile) => {
    const user = get().user;
    if (user) {
      set({ user: { ...user, ...profile } });
    }
  },
}));

// store/jobStore.ts
interface JobState {
  selectedJob: Job | null;
  filters: JobFilters;
  setSelectedJob: (job: Job | null) => void;
  updateFilters: (filters: Partial<JobFilters>) => void;
  clearFilters: () => void;
}

export const useJobStore = create<JobState>((set) => ({
  selectedJob: null,
  filters: {
    category: '',
    minBudget: 0,
    maxBudget: 0,
    skills: [],
    sortBy: 'newest',
  },

  setSelectedJob: (job) => set({ selectedJob: job }),
  
  updateFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),
    
  clearFilters: () =>
    set({
      filters: {
        category: '',
        minBudget: 0,
        maxBudget: 0,
        skills: [],
        sortBy: 'newest',
      },
    }),
}));
```

## 🎨 Page Layouts

### Landing Page
```typescript
// app/page.tsx
export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <StatsSection />
      <TestimonialsSection />
      <CTASection />
    </div>
  );
}

// Hero Section Component
function HeroSection() {
  return (
    <section className="relative bg-gradient-to-r from-primary-600 to-primary-800 text-white">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            The Future of Freelancing is
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              {" "}Decentralized
            </span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-primary-100">
            Zero fees. Instant payments. Global access. 
            Experience freelancing without borders on the blockchain.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Button size="lg" variant="secondary">
              Find Talent
            </Button>
            <Button size="lg" variant="outline">
              Start Freelancing
            </Button>
          </div>
        </div>
      </div>
      <WaveBackground />
    </section>
  );
}
```

### Dashboard Layout
```typescript
// app/(dashboard)/layout.tsx
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 lg:pl-64">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
```

### Job Browse Page
```typescript
// app/browse/page.tsx
export default function BrowsePage() {
  const [filters, setFilters] = useState<JobFilters>({});
  const { data: jobs, isLoading } = useJobs(filters);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <aside className="lg:col-span-1">
        <JobFilters
          filters={filters}
          onFiltersChange={setFilters}
        />
      </aside>
      
      <main className="lg:col-span-3">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Browse Jobs</h1>
          <JobSortSelector
            value={filters.sortBy}
            onChange={(sortBy) => setFilters({ ...filters, sortBy })}
          />
        </div>
        
        {isLoading ? (
          <JobCardSkeleton count={6} />
        ) : (
          <div className="grid gap-6">
            {jobs?.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
```

## 📱 Responsive Design

### Mobile Navigation
```typescript
// components/layout/MobileNav.tsx
export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setIsOpen(true)}
      >
        <MenuIcon className="h-6 w-6" />
      </Button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="left" className="w-64">
          <SheetHeader>
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <nav className="mt-6">
            {navigationItems.map((item) => (
              <MobileNavItem
                key={item.name}
                {...item}
                onClick={() => setIsOpen(false)}
              />
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
```

### Responsive Grid System
```css
/* Responsive job grid */
.job-grid {
  @apply grid gap-6;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
}

/* Mobile-first approach */
.container {
  @apply px-4;
  @apply sm:px-6;
  @apply lg:px-8;
  @apply mx-auto;
  @apply max-w-7xl;
}
```

This comprehensive frontend documentation provides everything needed to build a modern, responsive, and Web3-integrated freelancing platform. The component architecture is modular, the state management is efficient, and the design system is consistent and scalable.