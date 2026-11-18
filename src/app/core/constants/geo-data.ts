import { LocationPin } from '../models/memory.model';

export const WORLD_COUNTRIES: string[] = [
  'Ukraine',
  'United Kingdom',
  'United States',
  'Germany',
  'France',
  'Italy',
  'Spain',
  'Poland',
  'Canada',
  'Australia',
  'Austria',
  'Belgium',
  'Brazil',
  'Bulgaria',
  'Croatia',
  'Cyprus',
  'Czech Republic',
  'Denmark',
  'Estonia',
  'Finland',
  'Georgia',
  'Greece',
  'Hungary',
  'Iceland',
  'Ireland',
  'Israel',
  'Japan',
  'Latvia',
  'Lithuania',
  'Luxembourg',
  'Malta',
  'Mexico',
  'Netherlands',
  'New Zealand',
  'Norway',
  'Portugal',
  'Romania',
  'Slovakia',
  'Slovenia',
  'Sweden',
  'Switzerland',
  'Turkey'
];

export const POPULAR_LOCATIONS_SEED: Record<string, Record<string, string[]>> = {
  'Ukraine': {
    'Kyiv': ['Podil', 'Pechersk', 'Shevchenkivskyi', 'Obolon', 'Holosiiv'],
    'Lviv': ['Stare Misto', 'Rynok', 'Kastelivka', 'Znesinnia', 'Sykhiv'],
    'Odesa': ['Prymorskyi', 'Moldavanka', 'Fontan', 'Arcadia'],
    'Kharkiv': ['Center', 'Saltivka', 'Oleksiivka', 'Pavlove Pole']
  },
  'United Kingdom': {
    'Brighton': ['Preston Park', 'North Laine', 'Hove Seafront', 'Kemptown', 'Hanover'],
    'London': ['Camden', 'Soho', 'Shoreditch', 'Greenwich', 'Kensington'],
    'Manchester': ['Northern Quarter', 'Ancoats', 'Didsbury', 'Castlefield']
  },
  'Germany': {
    'Berlin': ['Mitte', 'Kreuzberg', 'Prenzlauer Berg', 'Neukolln', 'Charlottenburg'],
    'Munich': ['Altstadt', 'Schwabing', 'Glockenbachviertel', 'Maxvorstadt'],
    'Hamburg': ['St. Pauli', 'Altona', 'Sternschanze', 'HafenCity']
  },
  'Italy': {
    'Rome': ['Trastevere', 'Monti', 'Testaccio', 'Prati', 'San Lorenzo'],
    'Milan': ['Brera', 'Navigli', 'Porta Ticinese', 'Isola'],
    'Florence': ['Oltrarno', 'Santa Croce', 'San Frediano', 'San Marco']
  },
  'France': {
    'Paris': ['Le Marais', 'Montmartre', 'Latin Quarter', 'Belleville', 'Saint-Germain'],
    'Lyon': ['Vieux Lyon', 'Croix-Rousse', 'Presqu\'île'],
    'Marseille': ['Le Panier', 'Noailles', 'Endoume']
  },
  'Poland': {
    'Warsaw': ['Stare Miasto', 'Praga', 'Mokotow', 'Zoliborz', 'Srodmiescie'],
    'Krakow': ['Stare Miasto', 'Kazimierz', 'Podgorze', 'Nowa Huta'],
    'Wroclaw': ['Stare Miasto', 'Nadodrze', 'Ostrow Tumski', 'Krzyki']
  },
  'Spain': {
    'Madrid': ['Malasana', 'Chueca', 'La Latina', 'Lavapies', 'Salamanca'],
    'Barcelona': ['Gracia', 'El Born', 'Gothic Quarter', 'Poblenou', 'Eixample'],
    'Valencia': ['El Carmen', 'Ruzafa', 'Cabanyal']
  },
  'United States': {
    'New York': ['Greenwich Village', 'Williamsburg', 'SoHo', 'Harlem', 'Astoria'],
    'San Francisco': ['Mission District', 'North Beach', 'Castro', 'Haight-Ashbury'],
    'Chicago': ['Wicker Park', 'Lincoln Park', 'Logan Square', 'Pilsen']
  }
};

export const KNOWN_DISTRICT_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // Brighton & Hove (United Kingdom)
  'aldrington': { lat: 50.8354, lng: -0.1793 },
  'the lanes': { lat: 50.8217, lng: -0.1408 },
  'north laine': { lat: 50.8267, lng: -0.1388 },
  'preston park': { lat: 50.8409, lng: -0.1472 },
  'hove seafront': { lat: 50.8250, lng: -0.1680 },
  'hove': { lat: 50.8280, lng: -0.1750 },
  'kemptown': { lat: 50.8190, lng: -0.1240 },
  'hanover': { lat: 50.8280, lng: -0.1280 },
  'brighton': { lat: 50.8225, lng: -0.1372 },

  // London (United Kingdom)
  'camden': { lat: 51.5390, lng: -0.1426 },
  'soho': { lat: 51.5136, lng: -0.1365 },
  'shoreditch': { lat: 51.5233, lng: -0.0772 },
  'greenwich': { lat: 51.4826, lng: -0.0077 },
  'kensington': { lat: 51.5014, lng: -0.1919 },
  'london': { lat: 51.5074, lng: -0.1278 },

  // Ukraine - Kyiv
  'podil': { lat: 50.4680, lng: 30.5160 },
  'pechersk': { lat: 50.4300, lng: 30.5400 },
  'shevchenkivskyi': { lat: 50.4550, lng: 30.4900 },
  'obolon': { lat: 50.5000, lng: 30.5000 },
  'holosiiv': { lat: 50.3900, lng: 30.5100 },
  'kyiv': { lat: 50.4501, lng: 30.5234 },

  // Ukraine - Lviv
  'stare misto': { lat: 49.8419, lng: 24.0315 },
  'rynok': { lat: 49.8418, lng: 24.0316 },
  'kastelivka': { lat: 49.8280, lng: 24.0150 },
  'znesinnia': { lat: 49.8480, lng: 24.0550 },
  'sykhiv': { lat: 49.7900, lng: 24.0600 },
  'lviv': { lat: 49.8397, lng: 24.0297 },

  // Ukraine - Odesa
  'prymorskyi': { lat: 46.4750, lng: 30.7450 },
  'moldavanka': { lat: 46.4680, lng: 30.7150 },
  'fontan': { lat: 46.4250, lng: 30.7500 },
  'arcadia': { lat: 46.4300, lng: 30.7600 },
  'odesa': { lat: 46.4825, lng: 30.7233 },

  // France - Paris
  'le marais': { lat: 48.8575, lng: 2.3622 },
  'montmartre': { lat: 48.8867, lng: 2.3431 },
  'latin quarter': { lat: 48.8500, lng: 2.3450 },
  'belleville': { lat: 48.8710, lng: 2.3850 },
  'saint-germain': { lat: 48.8530, lng: 2.3320 },
  'paris': { lat: 48.8566, lng: 2.3522 },

  // Germany - Berlin
  'mitte': { lat: 52.5200, lng: 13.4050 },
  'kreuzberg': { lat: 52.4986, lng: 13.4034 },
  'prenzlauer berg': { lat: 52.5400, lng: 13.4200 },
  'berlin': { lat: 52.5200, lng: 13.4050 },

  // Spain - Barcelona
  'gracia': { lat: 41.4036, lng: 2.1569 },
  'el born': { lat: 41.3850, lng: 2.1830 },
  'gothic quarter': { lat: 41.3828, lng: 2.1764 },
  'barcelona': { lat: 41.3851, lng: 2.1734 },

  // USA - New York
  'soho (ny)': { lat: 40.7233, lng: -73.9985 },
  'williamsburg': { lat: 40.7081, lng: -73.9571 },
  'greenwich village': { lat: 40.7336, lng: -74.0027 },
  'new york': { lat: 40.7128, lng: -74.0060 }
};
