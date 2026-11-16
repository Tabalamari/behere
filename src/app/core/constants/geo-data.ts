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
