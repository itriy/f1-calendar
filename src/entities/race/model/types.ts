export interface JolpicaDriver {
  driverId: string;
  givenName: string;
  familyName: string;
  url?: string;
}

export interface JolpicaConstructor {
  constructorId: string;
  name: string;
  nationality?: string;
  url?: string;
}

export interface JolpicaResult {
  position: string;
  points: string;
  status?: string;
  Driver: JolpicaDriver;
  Constructor?: JolpicaConstructor;
  Time?: { time?: string };
}

export interface JolpicaRace {
  season?: string;
  round: string;
  raceName: string;
  date?: string;
  time?: string;
  Circuit?: {
    circuitId?: string;
    circuitName?: string;
    url?: string;
    Location?: {
      country?: string;
      locality?: string;
      lat?: string;
      long?: string;
    };
  };
  FirstPractice?: RaceSession;
  SecondPractice?: RaceSession;
  ThirdPractice?: RaceSession;
  Qualifying?: RaceSession;
  SprintQualifying?: RaceSession;
  Sprint?: RaceSession;
  Results?: JolpicaResult[];
}

export interface RaceSession {
  date?: string;
  time?: string;
}

export interface JolpicaDriverStanding {
  position: string;
  points: string;
  Driver: JolpicaDriver;
  Constructors?: JolpicaConstructor[];
}

export interface JolpicaConstructorStanding {
  position: string;
  points: string;
  Constructor: JolpicaConstructor;
}

export interface JolpicaResponse {
  MRData?: {
    RaceTable?: { season?: string; Races?: JolpicaRace[] };
    StandingsTable?: {
      StandingsLists?: Array<{
        DriverStandings?: JolpicaDriverStanding[];
        ConstructorStandings?: JolpicaConstructorStanding[];
      }>;
    };
    SeasonTable?: { Seasons?: Array<{ season: string }> };
  };
}

export interface StandingDriver {
  pos: string;
  name: string;
  url: string;
  team: string;
  teamUrl: string;
  points: string;
  code: string;
  color: string;
}
