// statesData.js - Multi-Country (Nigeria & Ghana) Region Data

export const NIGERIA_STATES = [
  { name: 'Abuja (FCT)', country: 'Nigeria', flag: '🇳🇬' },
  { name: 'Lagos State', country: 'Nigeria', flag: '🇳🇬' },
  { name: 'Rivers State', country: 'Nigeria', flag: '🇳🇬' },
  { name: 'Oyo State', country: 'Nigeria', flag: '🇳🇬' },
  { name: 'Kano State', country: 'Nigeria', flag: '🇳🇬' },
  { name: 'Kaduna State', country: 'Nigeria', flag: '🇳🇬' },
  { name: 'Anambra State', country: 'Nigeria', flag: '🇳🇬' },
  { name: 'Enugu State', country: 'Nigeria', flag: '🇳🇬' },
  { name: 'Ogun State', country: 'Nigeria', flag: '🇳🇬' },
  { name: 'Delta State', country: 'Nigeria', flag: '🇳🇬' },
  { name: 'Edo State', country: 'Nigeria', flag: '🇳🇬' },
  { name: 'Akwa Ibom State', country: 'Nigeria', flag: '🇳🇬' },
  { name: 'Abia State', country: 'Nigeria', flag: '🇳🇬' },
  { name: 'Adamawa State', country: 'Nigeria', flag: '🇳🇬' },
  { name: 'Bauchi State', country: 'Nigeria', flag: '🇳🇬' },
  { name: 'Bayelsa State', country: 'Nigeria', flag: '🇳🇬' },
  { name: 'Benue State', country: 'Nigeria', flag: '🇳🇬' },
  { name: 'Borno State', country: 'Nigeria', flag: '🇳🇬' },
  { name: 'Cross River State', country: 'Nigeria', flag: '🇳🇬' },
  { name: 'Ebonyi State', country: 'Nigeria', flag: '🇳🇬' },
  { name: 'Ekiti State', country: 'Nigeria', flag: '🇳🇬' },
  { name: 'Gombe State', country: 'Nigeria', flag: '🇳🇬' },
  { name: 'Imo State', country: 'Nigeria', flag: '🇳🇬' },
  { name: 'Jigawa State', country: 'Nigeria', flag: '🇳🇬' },
  { name: 'Katsina State', country: 'Nigeria', flag: '🇳🇬' },
  { name: 'Kebbi State', country: 'Nigeria', flag: '🇳🇬' },
  { name: 'Kogi State', country: 'Nigeria', flag: '🇳🇬' },
  { name: 'Kwara State', country: 'Nigeria', flag: '🇳🇬' },
  { name: 'Nasarawa State', country: 'Nigeria', flag: '🇳🇬' },
  { name: 'Niger State', country: 'Nigeria', flag: '🇳🇬' },
  { name: 'Ondo State', country: 'Nigeria', flag: '🇳🇬' },
  { name: 'Osun State', country: 'Nigeria', flag: '🇳🇬' },
  { name: 'Plateau State', country: 'Nigeria', flag: '🇳🇬' },
  { name: 'Sokoto State', country: 'Nigeria', flag: '🇳🇬' },
  { name: 'Taraba State', country: 'Nigeria', flag: '🇳🇬' },
  { name: 'Yobe State', country: 'Nigeria', flag: '🇳🇬' },
  { name: 'Zamfara State', country: 'Nigeria', flag: '🇳🇬' },
];

export const GHANA_REGIONS = [
  { name: 'Greater Accra Region', country: 'Ghana', flag: '🇬🇭' },
  { name: 'Ashanti Region', country: 'Ghana', flag: '🇬🇭' },
  { name: 'Central Region', country: 'Ghana', flag: '🇬🇭' },
  { name: 'Eastern Region', country: 'Ghana', flag: '🇬🇭' },
  { name: 'Western Region', country: 'Ghana', flag: '🇬🇭' },
  { name: 'Western North Region', country: 'Ghana', flag: '🇬🇭' },
  { name: 'Volta Region', country: 'Ghana', flag: '🇬🇭' },
  { name: 'Oti Region', country: 'Ghana', flag: '🇬🇭' },
  { name: 'Northern Region', country: 'Ghana', flag: '🇬🇭' },
  { name: 'Savannah Region', country: 'Ghana', flag: '🇬🇭' },
  { name: 'North East Region', country: 'Ghana', flag: '🇬🇭' },
  { name: 'Upper East Region', country: 'Ghana', flag: '🇬🇭' },
  { name: 'Upper West Region', country: 'Ghana', flag: '🇬🇭' },
  { name: 'Bono Region', country: 'Ghana', flag: '🇬🇭' },
  { name: 'Bono East Region', country: 'Ghana', flag: '🇬🇭' },
  { name: 'Ahafo Region', country: 'Ghana', flag: '🇬🇭' },
];

export const COUNTRIES = [
  {
    id: 'all',
    name: 'All Locations',
    shortName: 'All',
    flag: '🌍',
    allLabel: 'All Locations',
    currency: 'NGN / GHS',
    currencySymbol: '₦ / GH₵'
  },
  {
    id: 'nigeria',
    name: 'Nigeria',
    shortName: 'Nigeria',
    flag: '🇳🇬',
    allLabel: 'All Nigeria',
    currency: 'NGN',
    currencySymbol: '₦',
    regions: NIGERIA_STATES
  },
  {
    id: 'ghana',
    name: 'Ghana',
    shortName: 'Ghana',
    flag: '🇬🇭',
    allLabel: 'All Ghana',
    currency: 'GHS',
    currencySymbol: 'GH₵',
    regions: GHANA_REGIONS
  }
];

export const locations = [
  { name: 'All Locations', country: 'All', flag: '🌍' },
  { name: 'All Nigeria', country: 'Nigeria', flag: '🇳🇬' },
  ...NIGERIA_STATES,
  { name: 'All Ghana', country: 'Ghana', flag: '🇬🇭' },
  ...GHANA_REGIONS
];