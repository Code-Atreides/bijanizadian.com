// Where campus media goes: the 50 states and D.C., each with its region (the
// four used on /region), its main time zone (split states use the zone most of
// their campuses sit in) and its tile on the 8 x 11 U.S. tile-grid map /region
// draws. Shared by /campus/analytics (the map) and /campus/studio (schedules).
(function () {
  'use strict';

  var ZONES = {
    ET: { tz: 'America/New_York', label: 'ET' },
    CT: { tz: 'America/Chicago', label: 'CT' },
    MT: { tz: 'America/Denver', label: 'MT' },
    AZ: { tz: 'America/Phoenix', label: 'AZ time' },
    PT: { tz: 'America/Los_Angeles', label: 'PT' },
    AK: { tz: 'America/Anchorage', label: 'AKT' },
    HI: { tz: 'Pacific/Honolulu', label: 'HT' }
  };

  // abbr, name, region, zone, row, col
  var LIST = [
    ['AK', 'Alaska', 'West', 'AK', 1, 1], ['ME', 'Maine', 'Northeast', 'ET', 1, 11],
    ['VT', 'Vermont', 'Northeast', 'ET', 2, 10], ['NH', 'New Hampshire', 'Northeast', 'ET', 2, 11],
    ['WA', 'Washington', 'West', 'PT', 3, 1], ['ID', 'Idaho', 'West', 'MT', 3, 2], ['MT', 'Montana', 'West', 'MT', 3, 3],
    ['ND', 'North Dakota', 'Midwest', 'CT', 3, 4], ['MN', 'Minnesota', 'Midwest', 'CT', 3, 5], ['WI', 'Wisconsin', 'Midwest', 'CT', 3, 6],
    ['MI', 'Michigan', 'Midwest', 'ET', 3, 7], ['NY', 'New York', 'Northeast', 'ET', 3, 10], ['MA', 'Massachusetts', 'Northeast', 'ET', 3, 11],
    ['OR', 'Oregon', 'West', 'PT', 4, 1], ['NV', 'Nevada', 'West', 'PT', 4, 2], ['WY', 'Wyoming', 'West', 'MT', 4, 3],
    ['SD', 'South Dakota', 'Midwest', 'CT', 4, 4], ['IA', 'Iowa', 'Midwest', 'CT', 4, 5], ['IL', 'Illinois', 'Midwest', 'CT', 4, 6],
    ['IN', 'Indiana', 'Midwest', 'ET', 4, 7], ['OH', 'Ohio', 'Midwest', 'ET', 4, 8], ['PA', 'Pennsylvania', 'Northeast', 'ET', 4, 9],
    ['NJ', 'New Jersey', 'Northeast', 'ET', 4, 10], ['CT', 'Connecticut', 'Northeast', 'ET', 4, 11],
    ['CA', 'California', 'West', 'PT', 5, 1], ['UT', 'Utah', 'West', 'MT', 5, 2], ['CO', 'Colorado', 'West', 'MT', 5, 3],
    ['NE', 'Nebraska', 'Midwest', 'CT', 5, 4], ['MO', 'Missouri', 'Midwest', 'CT', 5, 5], ['KY', 'Kentucky', 'South', 'ET', 5, 6],
    ['WV', 'West Virginia', 'South', 'ET', 5, 7], ['VA', 'Virginia', 'South', 'ET', 5, 8], ['MD', 'Maryland', 'South', 'ET', 5, 9],
    ['DE', 'Delaware', 'South', 'ET', 5, 10], ['RI', 'Rhode Island', 'Northeast', 'ET', 5, 11],
    ['AZ', 'Arizona', 'West', 'AZ', 6, 2], ['NM', 'New Mexico', 'West', 'MT', 6, 3], ['KS', 'Kansas', 'Midwest', 'CT', 6, 4],
    ['AR', 'Arkansas', 'South', 'CT', 6, 5], ['TN', 'Tennessee', 'South', 'CT', 6, 6], ['NC', 'North Carolina', 'South', 'ET', 6, 7],
    ['SC', 'South Carolina', 'South', 'ET', 6, 8], ['DC', 'D.C.', 'South', 'ET', 6, 9],
    ['OK', 'Oklahoma', 'South', 'CT', 7, 4], ['LA', 'Louisiana', 'South', 'CT', 7, 5], ['MS', 'Mississippi', 'South', 'CT', 7, 6],
    ['AL', 'Alabama', 'South', 'CT', 7, 7], ['GA', 'Georgia', 'South', 'ET', 7, 8],
    ['HI', 'Hawaii', 'West', 'HI', 8, 1], ['TX', 'Texas', 'South', 'CT', 8, 4], ['FL', 'Florida', 'South', 'ET', 8, 9]
  ];

  var STATES = {};
  LIST.forEach(function (s) { STATES[s[0]] = { abbr: s[0], name: s[1], region: s[2], zone: s[3], row: s[4], col: s[5] }; });

  window.contentGeo = {
    ZONES: ZONES,
    STATES: STATES,
    REGIONS: ['West', 'Midwest', 'South', 'Northeast'],
    // the zones most of each region's campuses are in, main zone first
    REGION_ZONES: { West: ['PT', 'MT'], Midwest: ['CT', 'ET'], South: ['ET', 'CT'], Northeast: ['ET'] },
    sorted: function () { return LIST.map(function (s) { return STATES[s[0]]; }).sort(function (a, b) { return a.name.localeCompare(b.name); }); }
  };
})();
