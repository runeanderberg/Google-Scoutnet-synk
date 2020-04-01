/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/scouternasetjanster
 */

/**
 * Anropa denna funktion om du vill synkronisera både användare och grupper direkt efter varandra
 */
function AnvandareOchGrupper() {
  Anvandare();
  Grupper();
}


/*
 * Huvudfunktion för att hantera synkronisering av användarkonton med Scoutnet
 */
function Anvandare() {
  const defaultOrgUnitPath = '/Scoutnet';
  const suspendedOrgUnitPath = defaultOrgUnitPath + '/' + 'Avstängda';

  const allMembers = fetchScoutnetMembers(); // Alla medlemmar
  Logger.log('AllMembers.length by fetchScoutnetMembers = ' + allMembers.length);
  const useraccounts = getGoogleAccounts(defaultOrgUnitPath);

  const membersFromMailingLists = readUserAccountConfigMembers(allMembers); // Lägg till alla medlemmar som är med i e-postlista eller annat specat i konfiguration
  Logger.log('membersFromMailingLists.length by readUserAccountConfigMembers = ' + membersFromMailingLists.length);

  const memberNumbers = getMemberNumbers(membersFromMailingLists); // Medlemmar med dessa unika medlemsnummer ska användas
  const tmpMemberNumbers = memberNumbers.slice(0); // Gör kopia
  const members = getMembersByMemberNumbers(membersFromMailingLists, memberNumbers);

  Logger.log('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
  Logger.log('MemberNumbers.length = ' + memberNumbers.length);
  Logger.log('tmpMemberNumbers.length = ' + tmpMemberNumbers.length);
  /*
  Logger.log("Dessa Google-konton finns");
  for (i = 0; i < useraccounts.length; i++) {
   Logger.log(useraccounts[i].name.fullName + " " + useraccounts[i].primaryEmail + " " + useraccounts[i].externalIds[0].value);
  }
  */

  for (let p = 0; p < userAccountConfig.length; p++) { // Gå igenom medlemslistorna
    const scoutnetListId = userAccountConfig[p].scoutnetListId;
    let orgUnitPath = defaultOrgUnitPath;

    if (userAccountConfig[p].orgUnitPath) {
      // Bara om man anger någon suborg så anger vi den, annars blir det knas med
      // sista snedstrecket
      orgUnitPath = orgUnitPath + '/' + userAccountConfig[p].orgUnitPath;
    }

    Logger.log('----------------------------------');
    Logger.log('orgUnitPath = ' + orgUnitPath);

    createSuborganisationIfNeeded(orgUnitPath);

    var membersInAList;
    if (scoutnetListId) {
      membersInAList = fetchScoutnetMembersMultipleMailinglists(scoutnetListId, '', '');
    } else { // Om man ej anger listId för en e-postlista
      membersInAList = getScoutleaders(allMembers);
    }
    Logger.log('MembersInAlist antal personer= ' + membersInAList.length);
    Logger.log('TmpMemberNumbers.length = ' + tmpMemberNumbers.length);

    const membersInAListFiltered = []; // Medlemmar i denna e-postlista som ska gälla för denna suborganisation

    LoopMembersInAList:
    for (var i = 0; i < membersInAList.length; i++) { // Här skapar vi listan över vilka i denna e-postlista som redan är tillagda i
      for (var k = 0; k < tmpMemberNumbers.length; k++) { // någon organisation och inte ska läggas till i just denna.
        if (membersInAList[i].member_no == tmpMemberNumbers[k]) {
          Logger.log('I denna e-postlista finns ' + membersInAList[i].first_name + ' ' + membersInAList[i].last_name);
          membersInAListFiltered.push(membersInAList[i]);
          tmpMemberNumbers.splice(k, 1); // Ta bort medlemsnumret ur listan
          continue LoopMembersInAList;
        }
      }
    }

    Logger.log('Antal Scoutnetkonton i denna suborg= ' + membersInAListFiltered.length);
    Logger.log('Antal Googlekonton i denna hela org= ' + useraccounts.length);

    for (var k = 0; k < membersInAListFiltered.length; k++) { // Inom varje medlemslista
      let account_exists = false;

      userAccountsOuterLoop:
      for (var i = 0; i < useraccounts.length; i++) { // Kolla alla Googlekonton
        const num_externalIds = useraccounts[i].externalIds.length;
        // Logger.log("Antal externalIDS" + num_externalIds);
        for (let m = 0; m < num_externalIds; m++) {
          // Logger.log("Kollar om Scoutnet_member_id =" + membersInAListFiltered[k].member_no + " och Google id =" + useraccounts[i].externalIds[m].value);
          if (membersInAListFiltered[k].member_no==useraccounts[i].externalIds[m].value) { // If member_id match. Account exists
            account_exists = true; // Träff
            updateAccount(membersInAListFiltered[k], useraccounts[i], orgUnitPath); // Uppdatera konto vid behov
            // Logger.log("Detta konto finns " + useraccounts[i].name.fullName + " " + useraccounts[i].primaryEmail + " " + useraccounts[i].externalIds[m].value);
            break userAccountsOuterLoop;
          }
        }
      }

      if (!account_exists) { // Inget konto med detta medlemsnummer, så skapa det
        Logger.log('Dont exists K=' + k + membersInAListFiltered[k].first_name + ' ' + membersInAListFiltered[k].last_name);
        createAccount(membersInAListFiltered[k], orgUnitPath); // Skapa Googlekonto för denna användare
      }
    }
  }
  checkingIfToSuspendAccounts(useraccounts, memberNumbers, suspendedOrgUnitPath);
}


/*
 * Läser in samtliga medlemmar som är med i någon av de e-postlistor eller kårfunk
 * som är specificerad i e-postlista eller kårfunktionär i listan userAccountConfig
 *
 * @param {Object[]} allMembers - Lista över medlemsobjekt
 *
 * @returns {Object[]} - Lista med medlemmar som är med i någon av de listor från Scoutnet som ska synkroniseras
 */
function readUserAccountConfigMembers(allMembers) {
  const membersInMailingLists = [];

  for (let i = 0; i < userAccountConfig.length; i++) {
    const scoutnetListId = userAccountConfig[i].scoutnetListId;
    const orgUnitPath = userAccountConfig[i].orgUnitPath;
    Logger.log('Read UserAccountConfig = ' + i);
    Logger.log('aaa ScoutnetListId = ' + scoutnetListId);

    if (scoutnetListId) {
      membersInMailingLists.push.apply(membersInMailingLists, fetchScoutnetMembersMultipleMailinglists(scoutnetListId, '', ''));
    } else {
      membersInMailingLists.push.apply(membersInMailingLists, getScoutleaders(allMembers));
    }

    Logger.log(scoutnetListId + '   ' + orgUnitPath);
  }
  Logger.log('MembersInMailingLists.length ' + membersInMailingLists.length);

  return membersInMailingLists;
}


/**
 * Skapar en underorganisation om den inte finns
 * En sökväg till en underorganisation som parameter
 * Om den ej finns så skapas den
 * Fungerar på flera nivåer om de ovan inte redan är skapade
 *
 * @param {string} orgUnitPath - Sökväg för en underorganisation
 */
function createSuborganisationIfNeeded(orgUnitPath) {
  const index = orgUnitPath.lastIndexOf('/');
  const parentOrgUnitPath = orgUnitPath.substring(0, index);
  const name = orgUnitPath.substring(index+1, orgUnitPath.length);

  Logger.log('parentOrgUnitPath ' + parentOrgUnitPath);
  Logger.log('Orgname ' + name);

  if (!checkIfOrgUnitExists(parentOrgUnitPath)) {
    // Vi kollar om föräldra organisationen finns rekursivt, om ej så skapar vi den
    createSuborganisationIfNeeded(parentOrgUnitPath);
  }

  const boolOrgUnitExists = checkIfOrgUnitExists(orgUnitPath);
  if (!boolOrgUnitExists) {
    const orgUnit = {
      name: name,
      parentOrgUnitPath: parentOrgUnitPath,
    };

    try {
      AdminDirectory.Orgunits.insert(orgUnit, 'my_customer');
      Logger.log('Skapade orgUnit ' + orgUnitPath);
    } catch (e) {
      Logger.log('Misslyckades att skapa orgUnit ' + orgUnitPath);
      Logger.log('Fel ' + e);
    }
  }
}


/*
 * Kontrollera om en organisationsenhet med denna fulla sökväg existerar
 *
 * @param {string} orgUnitPath - Sökväg för en underorganisation
 *
 * @returns {boolean} - True eller false om underorganisationen existerar
 */
function checkIfOrgUnitExists(orgUnitPath) {
  try {
    const page = AdminDirectory.Orgunits.list('my_customer', {
      orgUnitPath: orgUnitPath,
    });
    Logger.log('OrgUnit ' + orgUnitPath + ' finns');
    return true;
  } catch (e) {
    Logger.log('OrgUnit ' + orgUnitPath + ' finns ej, men borde skapas');
    return false;
  }
}


/*
 * Kontrollera om ett användarkonto ska deaktiveras
 * Om det ej finns i listan med medlemsnummer så deaktiveras kontot
 *
 * @param {Objects[]} userAccounts - Lista med objekt av Googlekonton
 * @param {number[]} - Lista med medlemsnummer
 * @param {string} suspendedOrgUnitPath - Sökväg för underorganisationen för avstängda konton
 */
function checkingIfToSuspendAccounts(userAccounts, memberNumbers, suspendedOrgUnitPath) {
  Logger.log('Kolla om ett konto ska stängas av');

  createSuborganisationIfNeeded(suspendedOrgUnitPath);

  for (let i = 0; i < userAccounts.length; i++) { // kolla alla Googlekonton
    let member_exists = false;
    const num_externalIds = userAccounts[i].externalIds.length;

    for (let m = 0; m < num_externalIds; m++) {
      if (contains(memberNumbers, userAccounts[i].externalIds[m].value)) { // Om member_id finns. Användarkonto finns
        member_exists = true; // Träff
        // Logger.log("Detta konto har en träff " + userAccounts[i].name.fullName + " " + userAccounts[i].primaryEmail + " " + userAccounts[i].externalIds[m].value);
      }
    }
    if (!member_exists) { // Behöver inte loppa mer
      suspendAccount(userAccounts[i], suspendedOrgUnitPath);
    }
  }
}


/*
 * Gör namn redo för att vara en del i en användares e-postadress
 *
 * @param {string} name - Namn på en person
 *
 * @returns {string} - Namn på personen så det fungerar att ha i en e-postadress
 */
function makeNameReadyForEmailAdress(name) {
  let nameEmail = name.toLowerCase().trim(); // Ta bort tomma mellanrum vid start och slut och konvertera till gemener
  nameEmail = nameEmail.replace(/([\s])+/g, '.'); // Ersätt alla tommas mellanrum med en punkt (.)
  nameEmail = nameEmail.replace(/[.][\-]/g, '-').replace(/[\-][.]/g, '-'); // Om punkt följd av bindestreck eller tvärt om. Bara bindestreck i så fall.
  nameEmail = removeDiacritics(nameEmail);
  nameEmail = nameEmail.replace(/[^0-9a-z.\-]/gi, ''); // Ta bort om det inte är en engelsk bokstav eller nummer
  return nameEmail;
}


/*
 * Skapa ett Google användarkonto för en medlem
 *
 * @param {Object} member - Ett medlemsobjekt
 * @param {string} orgUnitPath - Sökväg till en underorganisation
 */
function createAccount(member, orgUnitPath) {
  const first_name = member.first_name;
  const first_name_email = makeNameReadyForEmailAdress(first_name);

  const last_name = member.last_name;
  const last_name_email = makeNameReadyForEmailAdress(last_name);

  let email = first_name_email + '.' + last_name_email + '@' + domain;

  if (checkIfEmailExists(email)) {
    for (let t = 1; t < 5; t++) { // Ska inte vara fler personer med samma namn. Programmet kraschar då med mening då något antagligen gått fel
      email = first_name_email + '.' + last_name_email + t + '@' + domain;

      if (!checkIfEmailExists(email)) { // Skapa denna e-postadress
        break;
      }
    }
  }

  let user = {
    'primaryEmail': email,
    'name': {
      givenName: first_name,
      familyName: last_name,
    },
    'externalIds': [
      {
        'value': member.member_no,
        'type': 'organization',
      },
    ],
    'orgUnitPath': orgUnitPath,
    'password': Math.random().toString(36), // Generera ett slumpat lösenord
  };
  user = AdminDirectory.Users.insert(user);

  Logger.log('Användare %s skapad.', user.primaryEmail);
}


/*
 * Kontrollera om ett konto med denna e-postadress existerar
 * @param {string} email - En e-postadress inom kårens GSuite
 *
 * @returns {boolean} - True eller false om e-postadressen finns
 */
function checkIfEmailExists(email) {
  let pageToken; let page;
  do {
    page = AdminDirectory.Users.list({
      domain: domain,
      query: email=email,
      orderBy: 'givenName',
      maxResults: 150,
      pageToken: pageToken,
    });
    users = page.users;
    if (users) {
      Logger.log('Denna adress finns redan ' + email);
      return true;
    } else {
      Logger.log('Ingen användare hittades med ' + email);
      return false;
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
}


/*
 * Uppdatera konto vid behov
 * Uppdatera namn, organisationssökväg och avbryt avstängning vid behov
 *
 * @param {Object} member - Ett medlemsobjekt
 * @param {Object} useraccount - Ett Googlekontoobjekt
 * @param {string} orgUnitPath - Sökväg för en underorganisation
 */
function updateAccount(member, useraccount, orgUnitPath) {
  const go_first_name = useraccount.name.givenName;
  const go_last_name = useraccount.name.familyName;
  const go_suspended = useraccount.suspended;
  const go_orgUnitPath = useraccount.orgUnitPath;

  const first_name = member.first_name;
  const last_name = member.last_name;

  const email = useraccount.primaryEmail;

  if (go_first_name!=first_name || go_last_name!=last_name || go_suspended || go_orgUnitPath!=orgUnitPath) {
    let user = {
      'name': {
        givenName: first_name,
        familyName: last_name,
      },
      'suspended': false,
      'orgUnitPath': orgUnitPath,
    };
    user = AdminDirectory.Users.update(user, email);
    Logger.log('Användare %s %s uppdaterad med namn till %s %s', go_first_name, go_last_name, first_name, last_name);
    Logger.log('Användaren är nu i org ' + orgUnitPath);
  }
}


/*
 * Stäng av användarkonto om det inte redan är avstängt
 *
 * @param {Object} userAccount - Ett objekt av ett Googlekonto
 * @param {string} suspendedOrgUnitPath - Sökväg för underorganisationen för avstängda konton
 */
function suspendAccount(userAccount, suspendedOrgUnitPath) {
  const email = userAccount.primaryEmail;
  const suspended = userAccount.suspended;
  const orgUnitPath = userAccount.orgUnitPath;

  if (!suspended || (orgUnitPath!=suspendedOrgUnitPath)) {
    let user = {
      'suspended': true,
      'orgUnitPath': suspendedOrgUnitPath,
    };

    user = AdminDirectory.Users.update(user, email);
    Logger.log('Användare %s är nu avstängd', email);
  } else {
    Logger.log('Användare %s är redan avstängd', email);
  }
}


/*
 * Returnerar en lista över alla Googlekonton för underorganisationen som synkroniserar med Scoutnet
 *
 * @param {string} defaultOrgUnitPath - Sökväg för en underorganisation
 *
 * @returns {Object[]} users - Lista med objekt av Googlekonton i denna underorganisation
 */
function getGoogleAccounts(defaultOrgUnitPath) {
  let users;
  let pageToken; let page;
  do {
    page = AdminDirectory.Users.list({
      domain: domain,
      query: 'orgUnitPath=\'' + defaultOrgUnitPath + '\'',
      orderBy: 'givenName',
      maxResults: 500,
      pageToken: pageToken,
    });
    users = page.users;
    if (users) {
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        // Logger.log('%s (%s)', user.name.fullName, user.primaryEmail);
      }
    } else {
      Logger.log('Ingen användare hittades.');
      const empty = [];
      return empty;
    }
    pageToken = page.nextPageToken;
  } while (pageToken);

  return users;
}


/*
 * Hämta en lista över alla aktiva scoutledare och andra funktionärer
 * genom att kontrollera om de har en avdelningsroll (unit_role) eller kårroll (group_role)
 *
 * @param {Object[]} allMembers - Lista med medlemsobjekt
 *
 * @returns {Object[]} leaders - Lista med medlemsobjekt för kårfunktionärer
 */
function getScoutleaders(allMembers) {
  const leaders = [];

  for (let i = 0; i < allMembers.length; i++) {
    const group_role = allMembers[i].group_role;
    const unit_role = allMembers[i].unit_role;

    if (group_role.length!=0 || unit_role.length!=0) {
      leaders.push(allMembers[i]);
    }
  }
  return leaders;
}


/*
 * Hämta lista över alla medlemmar
 *
 * @returns {Object[]} allMembers - Lista med medlemsobjekt för alla medlemmar i kåren
 */
function fetchScoutnetMembers() {
  const url = 'https://' + scoutnet_url + '/api/' + organisationType + '/memberlist?id=' + groupId + '&key=' + api_key_list_all + '&pretty=1';
  const response = UrlFetchApp.fetch(url, {'muteHttpExceptions': true});
  // Logger.log(response);

  const json = response.getContentText();
  const data = JSON.parse(json);

  const medlemmar = data.data;
  const allMembers = [];

  // Logger.log(medlemmar);
  for (x in medlemmar) {
    const medlem = medlemmar[x];

    const variabel_lista_not_lowercase = ['member_no', 'first_name', 'last_name', 'ssno', 'note', 'date_of_birth', 'status',
      'created_at', 'confirmed_at', 'group', 'unit', 'patrol', 'unit_role', 'group_role',
      'sex', 'address_co', 'address_1', 'address_2', 'address_3', 'postcode', 'town',
      'country', 'contact_mobile_phone', 'contact_home_phone', 'contact_mothers_name',
      'contact_mobile_mum', 'contact_telephone_mum', 'contact_fathers_name', 'contact_mobile_dad',
      'contact_telephone_dad', 'prev_term', 'prev_term_due_date', 'current_term', 'current_term_due_date'];

    // Dessa attributvärden ska användas som gemener för bättre jämförelser
    const variabel_lista_lowercase = ['email', 'contact_email_mum', 'contact_email_dad', 'contact_alt_email', 'extra_emails'];

    const member = setMemberFields(medlem, variabel_lista_not_lowercase, variabel_lista_lowercase);

    // Logger.log("MEMBER print object " + member);
    // Logger.log(member.member_no + "   " + member.first_name + "  " + member.last_name);
    // Logger.log(member.date_of_birth + "   " + member.confirmed_at + "  " + member.unit);
    // Logger.log(member.unit_role + "   " + member.group_role + "  " + member.email);
    // Logger.log(member.email_mum + "   " + member.email_dad + "  " + member.alt_email);
    allMembers.push(member);
  }
  // Logger.log("FETCH MEMBERS print object " + allMembers);
  return allMembers;
}


/*
 * Testfunktion för att lista alla Googlekonton som finns i underorganisationen "Scoutnet"
 * Max 100 stycken
 */
function listAllUsers() {
  let pageToken; let page;
  do {
    page = AdminDirectory.Users.list({
      domain: domain,
      query: 'orgUnitPath=\'/Scoutnet\'',
      orderBy: 'givenName',
      maxResults: 100,
      pageToken: pageToken,
    });
    const users = page.users;
    if (users) {
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        Logger.log('%s (%s)', user.name.fullName, user.primaryEmail);
        // Logger.log('%s (%s) %s', user.name.fullName, user.primaryEmail, externalIds[0].value);
      }
    } else {
      Logger.log('Inga användare hittades.');
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
}
