// convert file of mispellings in a weird format
// into rought json

var fs = require('fs');

fs.readFile('spell.raw', 'utf8', function(err, data) {
  if (err) {
    return console.log(err);
  }

  var lines = data.trim().split('\n');
  var spells = {};
  lines.forEach(function(line) {

    // ignore
    if (line[0] == '#') return;

    line = line.trim().replace('\r', '');

    var splits = line.split(': ');

    var word = splits[0];
    var word2;

    // word may be TWO WORDS:
    // English, enlist: Enlish
    if (splits[0].indexOf(',') > -1) {
      var wsplit = splits[0].split(', ');
      word = wsplit[0];
      word2 = wsplit[1];
    }


    var bads = (spells[word] ? spells[word] : []);

    bads.push(splits[1]);

    spells[word] = bads;

    if (word2) {
      spells[word2] = bads;
    }

  });

  // console.log(spells);

  fs.writeFile('clean.js', JSON.stringify(spells));


});
