const {config} = require('../config.js');

exports.scoutnet = class Scoutnet {
  /**
   * Returns a promise contaning all members.
   * @return {Promise<Object>}
   */
  getAllMembers() {
    return fetch(`${config.scoutnetURL}${config.organisationType}'/memberlist?id='${config.id}&key=${config.APIKeys.all}`)
        .then((response) => {
          if (!response.ok) {
            throw new Error('API-request failed');
          }
          return response.json();
        })
        .catch((error) => console.log('Error'));
  }

  /**
   * Returns a promise containing members in specified mail list.
   * @param {string} id  - mail list id.
   * @return {Promise<Object>}
   */
  getMembersFromMailList(id) {
    // email fields?
    return fetch(`${config.scoutnetURL}${config.organisationType}'/customlists?id='${config.id}&key=${config.APIKeys.mailing}&list_id=${id}`)
        .then((response) => {
          if (!response.ok) {
            throw new Error('API-request failed');
          }
          return response.json();
        })
        .catch((error) => console.log('Error'));
  }
};
