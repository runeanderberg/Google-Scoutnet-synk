exports.config = {
  domain: 'domain.se',
  id: 'nn', // Kårid
  APIKeys: {
    all: 'as7das7d7asd7asd7asd',
    mailing: 'f7dfvx8cvb8dfg7seg',
  },
  groupSpreadsheetURL: 'https://docs.google.com/spreadsheets/d/1ru524kj9645454jydk0/edit#gid=',
  organisationType: 'group', // 'group' || 'district',
  scoutnetAPIURL: 'https://www.scoutnet.se/api/',
  defaultOrgUnitPath: '/Scoutnet',
  userAccountConfig: [
    {
      scoutnetListId: '1234', //
      orgUnitPath: 'Styrelsen', // om du skriver Ledare så är det egentligen underorganisationen /Scoutnet/Ledare
    },
    {
      scoutnetListId: '8&rule_id=9874 (Roverscouter), 1122 (Kassör)', // Rover
      orgUnitPath: 'Kårfunk/Rover',
    },
    {
      scoutnetListId: '8 (Lurk)', // Ledare, Utmanare, Rover, Kårfunktionärer. Då alla roverscouter och kårkassören redan är med i en lista kommer de ej med här
      orgUnitPath: 'Kårfunk/LURK',
    },
  ],
};


/**
 * scoutnetId = id för e-postlistan i Scoutnet
 * orgUnitPath = sökvägen till underorganisationen relativt sökvägen där alla synkroniserade konton hamnar ( /Scoutnet )
 * Om en person finns i flera e-postlistor hamnar personen i den listas först här nedan.
 * T.ex om man vill har en underorganisation för alla medlemmar och en för endast ledare ska den för ledare skrivas först,
 * för annars hamnar alla ledare i den underorganisationen
 * Underorganisationerna skapas automatiskt om de inte finns sedan innan, men inga kommar tas bort om man byter namn här
 * Det går att ha flera nivår på underorgansiationer. T.ex /Scoutnet/Kårfunktionärer/Ledare/Spårarledare vilket då skrivs
 * som Kårfunktionärer/Ledare/Spårarledare nedan
 */
