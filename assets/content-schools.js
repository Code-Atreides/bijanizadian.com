// The fomo campus program's schools, for local hashtags in /campus/studio and
// state prefill in /campus/analytics. Members and chapters are from the Greek
// Wars chapter registrations snapshot of 2026-10-05 (2dgreekvillage/snapshot.json)
// and only rank campuses within a region. Tags are each school's well-known
// student and athletics hashtags (nicknames and slogans), most specific first;
// where a nickname tag is shared with other schools or unclear, the school gets a
// plain name tag instead. Volumes aren't checked: look a tag up in TikTok search
// before a big push. Aliases are short forms that can't mean another school here,
// so "USC" (Southern California or South Carolina) and "OSU" are left out.
(function () {
  'use strict';

  // name, short name, state, members, chapters, tags, aliases
  var LIST = [
    ['Indiana University - Bloomington', 'Indiana', 'IN', 260, 7, '#hoosiers #iubloomington', 'Indiana University|IU|IU Bloomington|Indiana'],
    ['University of Florida', 'Florida', 'FL', 248, 7, '#gogators #uf', 'UF|Florida Gators'],
    ['Rutgers University', 'Rutgers', 'NJ', 126, 10, '#rutgers', 'Rutgers'],
    ['Arizona State University', 'Arizona State', 'AZ', 115, 10, '#forksup #asu', 'ASU|Arizona State'],
    ['San Diego State University', 'San Diego State', 'CA', 108, 4, '#goaztecs #sdsu', 'SDSU|San Diego State'],
    ['Ohio University', 'Ohio U', 'OH', 80, 2, '#ohiou', 'Ohio U'],
    ['University of South Carolina', 'South Carolina', 'SC', 75, 3, '#gamecocks #forevertothee', 'South Carolina|UofSC'],
    ['University of Michigan - Ann Arbor', 'Michigan', 'MI', 57, 3, '#goblue #umich', 'University of Michigan|Michigan|UMich'],
    ['Southern Methodist University', 'SMU', 'TX', 46, 2, '#ponyup #smu', 'SMU'],
    ['University of Tampa', 'Tampa', 'FL', 43, 2, '#utampa', 'Tampa|UT Tampa'],
    ['University of Central Florida', 'UCF', 'FL', 36, 4, '#chargeon #ucf', 'UCF'],
    ['Coastal Carolina University', 'Coastal Carolina', 'SC', 34, 1, '#chanticleers #coastalcarolina', 'Coastal Carolina|CCU'],
    ['University of Colorado at Boulder', 'CU Boulder', 'CO', 33, 4, '#skobuffs #cuboulder', 'CU Boulder|Colorado'],
    ['The University of Texas at Austin', 'UT Austin', 'TX', 30, 3, '#hookem #utaustin', 'UT Austin|Texas'],
    ['Florida International University', 'FIU', 'FL', 29, 3, '#fiu', 'FIU'],
    ['Pennsylvania State University', 'Penn State', 'PA', 26, 3, '#weare #pennstate', 'Penn State|PSU'],
    ['Temple University', 'Temple', 'PA', 26, 1, '#templemade #templeu', 'Temple'],
    ['University of Arizona', 'Arizona', 'AZ', 22, 4, '#beardown #arizonawildcats', 'Arizona|U of Arizona'],
    ['Purdue University', 'Purdue', 'IN', 21, 2, '#boilerup #purdue', 'Purdue'],
    ['The University of Alabama', 'Alabama', 'AL', 20, 3, '#rolltide #bama', 'Alabama|University of Alabama|Bama'],
    ['State University of New York at Buffalo', 'Buffalo', 'NY', 18, 1, '#ubuffalo', 'University at Buffalo|Buffalo|UB'],
    ['Colorado State University', 'Colorado State', 'CO', 12, 2, '#colostate', 'Colorado State'],
    ['Wake Forest University', 'Wake Forest', 'NC', 10, 1, '#godeacs #wakeforest', 'Wake Forest|Wake'],
    ['Syracuse University', 'Syracuse', 'NY', 9, 4, '#cuse #syracuseu', 'Syracuse|Cuse'],
    ['University of Cincinnati', 'Cincinnati', 'OH', 7, 1, '#bearcats #ucincinnati', 'Cincinnati'],
    ['Clemson University', 'Clemson', 'SC', 6, 9, '#clemson #clemsonfamily', 'Clemson'],
    ['East Carolina University', 'East Carolina', 'NC', 6, 4, '#ecu #gopirates', 'ECU|East Carolina'],
    ['Emory University', 'Emory', 'GA', 5, 3, '#emory', 'Emory'],
    ['Salisbury University', 'Salisbury', 'MD', 5, 2, '#salisburyu', 'Salisbury'],
    ['University of Tennessee, Knoxville', 'Tennessee', 'TN', 3, 2, '#govols #utk', 'Tennessee|UTK'],
    ['State University of New York at Albany', 'UAlbany', 'NY', 3, 1, '#ualbany', 'UAlbany|Albany'],
    ['North Carolina State University', 'NC State', 'NC', 3, 1, '#ncstate', 'NC State|NCSU'],
    ['Oklahoma State University', 'Oklahoma State', 'OK', 3, 1, '#gopokes #okstate', 'Oklahoma State|OK State'],
    ['Virginia Tech', 'Virginia Tech', 'VA', 2, 3, '#hokies #virginiatech', 'VT'],
    ['Texas Christian University', 'TCU', 'TX', 2, 1, '#gofrogs #tcu', 'TCU'],
    ['University of Southern California', 'USC (Southern California)', 'CA', 2, 4, '#fighton #usctrojans', 'Southern California'],
    ['San Francisco State University', 'SF State', 'CA', 2, 1, '#sfsu', 'SFSU|SF State'],
    ['State University of New York at Stony Brook', 'Stony Brook', 'NY', 2, 1, '#stonybrooku', 'Stony Brook'],
    ['James Madison University', 'JMU', 'VA', 2, 3, '#jmu', 'JMU|James Madison'],
    ['University of Illinois Urbana-Champaign', 'Illinois', 'IL', 2, 2, '#illini #uiuc', 'UIUC|Illinois'],
    ['Colby College', 'Colby', 'ME', 2, 1, '#colbycollege', 'Colby'],
    ['New York University', 'NYU', 'NY', 1, 4, '#nyu', 'NYU'],
    ['University of North Carolina at Chapel Hill', 'UNC', 'NC', 1, 3, '#goheels #unc', 'UNC|Chapel Hill'],
    ['Oregon State University', 'Oregon State', 'OR', 1, 2, '#gobeavs #oregonstate', 'Oregon State'],
    ['California State University, Northridge', 'CSUN', 'CA', 1, 2, '#csun', 'CSUN'],
    ['Columbia University', 'Columbia', 'NY', 1, 2, '#columbiauniversity', 'Columbia University'],
    ['University of California, San Diego', 'UC San Diego', 'CA', 1, 1, '#ucsd', 'UCSD|UC San Diego'],
    ['Marist College', 'Marist', 'NY', 1, 1, '#marist', 'Marist'],
    ['Florida Agricultural and Mechanical University', 'FAMU', 'FL', 1, 1, '#famu', 'FAMU'],
    ['Washington State University', 'Washington State', 'WA', 1, 1, '#gocougs #wsu', 'WSU|Washington State'],
    ['Appalachian State University', 'App State', 'NC', 1, 1, '#appstate', 'App State|Appalachian State'],
    ['Georgia Southern University', 'Georgia Southern', 'GA', 1, 1, '#hailsouthern #georgiasouthern', 'Georgia Southern'],
    ['Eastern Illinois University', 'Eastern Illinois', 'IL', 1, 1, '#eiu', 'EIU|Eastern Illinois'],
    ['Cornell University', 'Cornell', 'NY', 0, 3, '#cornell', 'Cornell'],
    ['Ohio State University - Columbus', 'Ohio State', 'OH', 0, 3, '#gobucks #ohiostate', 'Ohio State'],
    ['Elon University', 'Elon', 'NC', 0, 2, '#elon', 'Elon'],
    ['Hofstra University', 'Hofstra', 'NY', 0, 1, '#hofstra', 'Hofstra'],
    ['Case Western Reserve University', 'Case Western', 'OH', 0, 1, '#cwru', 'Case Western|CWRU'],
    ['Florida State University', 'Florida State', 'FL', 0, 3, '#gonoles #fsu', 'FSU|Florida State'],
    ['Lone Star College System', 'Lone Star College', 'TX', 0, 1, '#lonestarcollege', 'Lone Star College'],
    ['CUNY Baruch College', 'Baruch', 'NY', 0, 1, '#baruchcollege', 'Baruch|Baruch College'],
    ['University of Mississippi', 'Ole Miss', 'MS', 0, 1, '#hottytoddy #olemiss', 'Ole Miss'],
    ['University of Missouri', 'Mizzou', 'MO', 0, 1, '#mizzou', 'Mizzou|Missouri'],
    ['Harvard University', 'Harvard', 'MA', 0, 1, '#harvard', 'Harvard'],
    ['California State University, Chico', 'Chico State', 'CA', 0, 1, '#chicostate', 'Chico State|Chico'],
    ['Tulane University', 'Tulane', 'LA', 0, 2, '#rollwave #tulane', 'Tulane'],
    ['University of Houston', 'Houston', 'TX', 0, 4, '#gocoogs #uhouston', 'Houston|UH'],
    ['Northeastern University', 'Northeastern', 'MA', 0, 1, '#northeastern', 'Northeastern|NEU'],
    ['Miami University of Ohio', 'Miami (OH)', 'OH', 0, 2, '#miamioh', 'Miami OH|Miami of Ohio|Miami University'],
    ['Michigan State University', 'Michigan State', 'MI', 0, 2, '#spartans #michiganstate', 'Michigan State'],
    ['State University of New York at Binghamton', 'Binghamton', 'NY', 0, 1, '#binghamtonu', 'Binghamton'],
    ['Creighton University', 'Creighton', 'NE', 0, 1, '#gojays #creighton', 'Creighton'],
    ['Duquesne University', 'Duquesne', 'PA', 0, 1, '#duquesne', 'Duquesne'],
    ['University of Nevada, Reno', 'Nevada', 'NV', 0, 1, '#unr', 'UNR|Nevada Reno'],
    ['Stanford University', 'Stanford', 'CA', 0, 1, '#gostanford #stanford', 'Stanford'],
    ['Embry-Riddle Aeronautical University', 'Embry-Riddle', 'FL', 0, 1, '#embryriddle', 'Embry-Riddle|ERAU'],
    ['University of North Carolina at Charlotte', 'Charlotte', 'NC', 0, 1, '#charlotte49ers #uncc', 'UNC Charlotte|UNCC|Charlotte'],
    ['Alma College', 'Alma', 'MI', 0, 1, '#almacollege', 'Alma'],
    ['University of Illinois Chicago', 'UIC', 'IL', 0, 1, '#uic', 'UIC'],
    ['University of Pennsylvania', 'Penn', 'PA', 0, 1, '#upenn', 'UPenn|Penn'],
    ['California Institute of Technology', 'Caltech', 'CA', 0, 1, '#caltech', 'Caltech'],
    ['Texas Tech University', 'Texas Tech', 'TX', 0, 2, '#wreckem #texastech', 'Texas Tech|TTU'],
    ['University of Minnesota', 'Minnesota', 'MN', 0, 2, '#gophers #skiumah', 'Minnesota|UMN'],
    ['Northern Arizona University', 'NAU', 'AZ', 0, 1, '#nau', 'NAU|Northern Arizona'],
    ['University of Oregon', 'Oregon', 'OR', 0, 1, '#goducks #uoregon', 'Oregon'],
    ['Mississippi State University', 'Mississippi State', 'MS', 0, 1, '#hailstate #msstate', 'Mississippi State|Miss State'],
    ['California State University, Fullerton', 'Cal State Fullerton', 'CA', 0, 1, '#csuf', 'CSUF|Cal State Fullerton'],
    ['University of Miami', 'Miami', 'FL', 0, 1, '#gocanes #theu', 'The U'],
    ['University of Massachusetts at Amherst', 'UMass', 'MA', 0, 1, '#umass #umassamherst', 'UMass|UMass Amherst'],
    ['University of California, Santa Barbara', 'UCSB', 'CA', 0, 1, '#ucsb', 'UCSB|UC Santa Barbara'],
    ['Colorado Mesa University', 'Colorado Mesa', 'CO', 0, 1, '#coloradomesa', 'Colorado Mesa'],
    ['Santa Monica College', 'Santa Monica College', 'CA', 0, 1, '#santamonicacollege', 'Santa Monica College|SMC'],
    ['San Jose State University', 'San Jose State', 'CA', 0, 1, '#sjsu', 'SJSU|San Jose State']
  ];

  function key(text) { return String(text || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  var SCHOOLS = LIST.map(function (s) {
    return { name: s[0], short: s[1], state: s[2], members: s[3], chapters: s[4], tags: s[5].split(' '), aliases: s[6].split('|') };
  });
  var INDEX = {};
  SCHOOLS.forEach(function (s) { [s.name].concat(s.aliases).forEach(function (n) { INDEX[key(n)] = s; }); });
  // a short name can't be an alias for two schools
  SCHOOLS.forEach(function (s) { if (!INDEX[key(s.short)]) INDEX[key(s.short)] = s; });

  window.contentSchools = {
    list: SCHOOLS,
    // the program school a typed name means, if it can only mean one
    find: function (text) { return INDEX[key(text)] || null; }
  };
})();
