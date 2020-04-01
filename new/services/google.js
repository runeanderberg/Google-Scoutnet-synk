const {config} = require('../config.js');

exports.google = class Google {
  /**
   * TODO
   * @return {Object[]}
   */
  getGoogleAccounts() {
    let users;
    let pageToken;
    let page;
    do {
      page = AdminDirectory.Users.list({
        domain: config.domain,
        query: `orgUnitPath='${config.defaultOrgUnitPath}'`,
        orderBy: 'givenName',
        maxResults: 500,
        pageToken: pageToken,
      });
      users = page.users;
      if (!users) {
        console.log('No Google Accounts found');
        return [];
      }
      pageToken = page.nextPageToken;
    } while (pageToken);

    return users;
  }
};
