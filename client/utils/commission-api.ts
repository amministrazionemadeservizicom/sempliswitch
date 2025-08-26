import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface FirebaseUser {
  uid: string;
  nome: string;
  cognome: string;
  ruolo: string;
  pianoCompensi?: string;
  email: string;
  attivo: boolean;
}

interface FirebaseContract {
  id: string;
  creatoDa: {
    id: string;
    nome: string;
    cognome: string;
    ruolo: string;
  };
  statoOfferta: string;
  gestore: string;
  tipologiaContratto: 'energia' | 'telefonia';
  dataCreazione: string;
  contatto: {
    nome: string;
    cognome: string;
    codiceFiscale: string;
  };
}

interface CommissionPlan {
  nome: string;
  luce: number;
  gas: number;
  telefonia: number;
}

interface MonthlyCommissionData {
  month: number;
  year: number;
  contracts: {
    luce: number;
    gas: number;
    telefonia: number;
  };
  commissionPlan: {
    luce: number;
    gas: number;
    telefonia: number;
  };
}

interface CommissionComparison {
  previousMonth: {
    commission: number;
    percentage: number;
  };
  sameMonthLastYear: {
    commission: number;
    percentage: number;
  };
}

interface UserCommissionSummary {
  userId: string;
  userName: string;
  planName: string;
  monthlyData: MonthlyCommissionData;
  comparisons: CommissionComparison;
  contractsByProvider: {
    [provider: string]: {
      luce: number;
      gas: number;
      telefonia: number;
      totalCommission: number;
    };
  };
}

// Default commission plans (fallback if none found in DB)
const DEFAULT_COMMISSION_PLANS: { [key: string]: CommissionPlan } = {
  'Piano Standard': { nome: 'Piano Standard', luce: 25, gas: 20, telefonia: 12 },
  'Piano Senior': { nome: 'Piano Senior', luce: 30, gas: 25, telefonia: 15 },
  'Piano Junior': { nome: 'Piano Junior', luce: 22, gas: 18, telefonia: 10 },
  'Piano Master': { nome: 'Piano Master', luce: 35, gas: 30, telefonia: 18 },
};

// Utility function to check if a contract is not cancelled
const isActiveContract = (contract: FirebaseContract): boolean => {
  return contract.statoOfferta !== 'Annullato' && 
         contract.statoOfferta !== 'Inserimento KO' &&
         contract.statoOfferta !== 'Stornato';
};

// Get contracts for a specific month/year
const getContractsForPeriod = (contracts: FirebaseContract[], month: number, year: number): FirebaseContract[] => {
  return contracts.filter(contract => {
    const date = new Date(contract.dataCreazione);
    return date.getMonth() === month && 
           date.getFullYear() === year && 
           isActiveContract(contract);
  });
};

// Mock data fallback
const MOCK_USERS: FirebaseUser[] = [
  {
    uid: 'user1',
    nome: 'Mario',
    cognome: 'Rossi',
    ruolo: 'consulente',
    pianoCompensi: 'Piano Senior',
    email: 'mario.rossi@example.com',
    attivo: true
  },
  {
    uid: 'user2',
    nome: 'Giulia',
    cognome: 'Verdi',
    ruolo: 'consulente',
    pianoCompensi: 'Piano Junior',
    email: 'giulia.verdi@example.com',
    attivo: true
  }
];

const MOCK_CONTRACTS: FirebaseContract[] = [
  {
    id: '1',
    creatoDa: { id: 'user1', nome: 'Mario', cognome: 'Rossi', ruolo: 'consulente' },
    statoOfferta: 'Pagato',
    gestore: 'A2A',
    tipologiaContratto: 'energia',
    dataCreazione: '2024-01-15',
    contatto: { nome: 'Cliente', cognome: 'Test', codiceFiscale: 'TEST123' }
  },
  {
    id: '2',
    creatoDa: { id: 'user1', nome: 'Mario', cognome: 'Rossi', ruolo: 'consulente' },
    statoOfferta: 'Pagato',
    gestore: 'Edison',
    tipologiaContratto: 'energia',
    dataCreazione: '2024-01-20',
    contatto: { nome: 'Cliente', cognome: 'Test2', codiceFiscale: 'TEST456' }
  },
  {
    id: '3',
    creatoDa: { id: 'user1', nome: 'Mario', cognome: 'Rossi', ruolo: 'consulente' },
    statoOfferta: 'Pagato',
    gestore: 'TIM',
    tipologiaContratto: 'telefonia',
    dataCreazione: '2024-02-10',
    contatto: { nome: 'Cliente', cognome: 'Test3', codiceFiscale: 'TEST789' }
  },
  {
    id: '4',
    creatoDa: { id: 'user2', nome: 'Giulia', cognome: 'Verdi', ruolo: 'consulente' },
    statoOfferta: 'Pagato',
    gestore: 'A2A',
    tipologiaContratto: 'energia',
    dataCreazione: '2024-01-25',
    contatto: { nome: 'Cliente', cognome: 'Test4', codiceFiscale: 'TEST101' }
  }
];

// Check if user is authenticated
const isUserAuthenticated = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(!!user);
    });
  });
};

// Fetch all users from Firebase
const fetchAllUsers = async (): Promise<FirebaseUser[]> => {
  try {
    // Check if user is authenticated
    const isAuthenticated = await isUserAuthenticated();
    if (!isAuthenticated) {
      console.log('User not authenticated, using mock data');
      return MOCK_USERS;
    }

    const usersQuery = query(
      collection(db, 'utenti'),
      where('attivo', '==', true),
      where('ruolo', 'in', ['consulente', 'master'])
    );

    const snapshot = await getDocs(usersQuery);
    const users = snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    } as FirebaseUser));

    return users.length > 0 ? users : MOCK_USERS;
  } catch (error) {
    console.error('Error fetching users, using mock data:', error);
    return MOCK_USERS;
  }
};

// Fetch all contracts from Firebase
const fetchAllContracts = async (): Promise<FirebaseContract[]> => {
  try {
    // Check if user is authenticated
    const isAuthenticated = await isUserAuthenticated();
    if (!isAuthenticated) {
      console.log('User not authenticated, using mock contracts');
      return MOCK_CONTRACTS;
    }

    const contractsQuery = query(collection(db, 'contracts'));
    const snapshot = await getDocs(contractsQuery);

    const contracts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as FirebaseContract));

    return contracts.length > 0 ? contracts : MOCK_CONTRACTS;
  } catch (error) {
    console.error('Error fetching contracts, using mock data:', error);
    return MOCK_CONTRACTS;
  }
};

// Fetch commission plans from Firebase
const fetchCommissionPlans = async (): Promise<{ [key: string]: CommissionPlan }> => {
  try {
    // Check if user is authenticated
    const isAuthenticated = await isUserAuthenticated();
    if (!isAuthenticated) {
      console.log('User not authenticated, using default commission plans');
      return DEFAULT_COMMISSION_PLANS;
    }

    const compensiQuery = query(collection(db, 'compensi'));
    const snapshot = await getDocs(compensiQuery);

    const plans: { [key: string]: CommissionPlan } = {};

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.nome && data.luce && data.gas && data.telefonia) {
        plans[data.nome] = {
          nome: data.nome,
          luce: data.luce,
          gas: data.gas,
          telefonia: data.telefonia
        };
      }
    });

    // If no plans found in Firebase, use defaults
    return Object.keys(plans).length > 0 ? plans : DEFAULT_COMMISSION_PLANS;
  } catch (error) {
    console.error('Error fetching commission plans, using defaults:', error);
    return DEFAULT_COMMISSION_PLANS;
  }
};

// Determine service type from contract
const getServiceType = (contract: FirebaseContract): 'luce' | 'gas' | 'telefonia' => {
  if (contract.tipologiaContratto === 'telefonia') {
    return 'telefonia';
  }

  // For energia contracts, we need to determine if it's luce or gas
  const gestore = contract.gestore?.toLowerCase() || '';

  // Common gas providers
  if (gestore.includes('gas') || gestore.includes('snam') || gestore.includes('italgas')) {
    return 'gas';
  }

  // For mock data and specific providers, alternate between luce and gas
  if (gestore.includes('edison') || gestore.includes('eni')) {
    return 'gas';
  }

  // Default to luce for energia contracts
  return 'luce';
};

// Calculate commission for a user in a specific month
const calculateUserCommission = async (
  userId: string, 
  month: number, 
  year: number,
  allUsers: FirebaseUser[],
  allContracts: FirebaseContract[],
  commissionPlans: { [key: string]: CommissionPlan }
): Promise<UserCommissionSummary | null> => {
  const user = allUsers.find(u => u.uid === userId);
  if (!user) return null;

  const userContracts = allContracts.filter(c => c.creatoDa?.id === userId);
  const monthContracts = getContractsForPeriod(userContracts, month, year);

  // Get user's commission plan
  const userPlanName = user.pianoCompensi || 'Piano Standard';
  const commissionPlan = commissionPlans[userPlanName] || DEFAULT_COMMISSION_PLANS['Piano Standard'];

  // Count contracts by service
  const contractCounts = {
    luce: 0,
    gas: 0,
    telefonia: 0
  };

  monthContracts.forEach(contract => {
    const serviceType = getServiceType(contract);
    contractCounts[serviceType]++;
  });

  // Group contracts by provider
  const contractsByProvider: { [provider: string]: any } = {};
  monthContracts.forEach(contract => {
    const provider = contract.gestore || 'Sconosciuto';
    const serviceType = getServiceType(contract);
    
    if (!contractsByProvider[provider]) {
      contractsByProvider[provider] = {
        luce: 0,
        gas: 0,
        telefonia: 0,
        totalCommission: 0
      };
    }
    contractsByProvider[provider][serviceType]++;
    contractsByProvider[provider].totalCommission += commissionPlan[serviceType];
  });

  // Calculate current month commission
  const currentCommission = 
    (contractCounts.luce * commissionPlan.luce) +
    (contractCounts.gas * commissionPlan.gas) +
    (contractCounts.telefonia * commissionPlan.telefonia);

  // Calculate previous month data
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const prevMonthContracts = getContractsForPeriod(userContracts, prevMonth, prevYear);
  
  let prevMonthCommission = 0;
  prevMonthContracts.forEach(contract => {
    const serviceType = getServiceType(contract);
    prevMonthCommission += commissionPlan[serviceType];
  });
  
  const prevMonthPercentage = prevMonthCommission > 0 
    ? ((currentCommission - prevMonthCommission) / prevMonthCommission) * 100 
    : currentCommission > 0 ? 100 : 0;

  // Calculate same month last year data
  const lastYearContracts = getContractsForPeriod(userContracts, month, year - 1);
  
  let lastYearCommission = 0;
  lastYearContracts.forEach(contract => {
    const serviceType = getServiceType(contract);
    lastYearCommission += commissionPlan[serviceType];
  });
  
  const lastYearPercentage = lastYearCommission > 0 
    ? ((currentCommission - lastYearCommission) / lastYearCommission) * 100 
    : currentCommission > 0 ? 100 : 0;

  return {
    userId,
    userName: `${user.nome} ${user.cognome}`,
    planName: commissionPlan.nome,
    monthlyData: {
      month,
      year,
      contracts: contractCounts,
      commissionPlan: {
        luce: commissionPlan.luce,
        gas: commissionPlan.gas,
        telefonia: commissionPlan.telefonia
      }
    },
    comparisons: {
      previousMonth: {
        commission: prevMonthCommission,
        percentage: prevMonthPercentage
      },
      sameMonthLastYear: {
        commission: lastYearCommission,
        percentage: lastYearPercentage
      }
    },
    contractsByProvider
  };
};

// Get commission data based on user role
export const getCommissionData = async (
  userRole: string,
  userId: string,
  month: number,
  year: number
): Promise<{
  currentUser?: UserCommissionSummary;
  allUsers?: UserCommissionSummary[];
}> => {
  try {
    // Fetch all required data
    const [allUsers, allContracts, commissionPlans] = await Promise.all([
      fetchAllUsers(),
      fetchAllContracts(),
      fetchCommissionPlans()
    ]);

    if (userRole === 'admin') {
      // Admin sees all users
      const allUsersSummaries = await Promise.all(
        allUsers.map(user => 
          calculateUserCommission(user.uid, month, year, allUsers, allContracts, commissionPlans)
        )
      );

      return { 
        allUsers: allUsersSummaries.filter(Boolean) as UserCommissionSummary[] 
      };
    } else if (userRole === 'consulente' || userRole === 'master') {
      // Consultants see only their own data
      const currentUser = await calculateUserCommission(
        userId, month, year, allUsers, allContracts, commissionPlans
      );
      
      return { currentUser: currentUser || undefined };
    } else {
      // Back office and other roles don't see commission data
      return {};
    }
  } catch (error) {
    console.error('Error getting commission data:', error);
    return {};
  }
};

// Get all available months/years for the dropdown
export const getAvailablePeriods = (): { month: number; year: number; label: string }[] => {
  const currentDate = new Date();
  const periods = [];
  
  for (let i = 0; i < 12; i++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    periods.push({
      month: date.getMonth(),
      year: date.getFullYear(),
      label: `${MONTHS[date.getMonth()]} ${date.getFullYear()}`
    });
  }
  
  return periods;
};

const MONTHS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];
