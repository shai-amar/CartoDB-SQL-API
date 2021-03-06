require('../../helper');
require('../../support/assert');


var app    = require(global.settings.app_root + '/app/controllers/app')()
    , assert = require('assert')
    , querystring = require('querystring')
    , _ = require('underscore')
    , zipfile = require('zipfile')
    , fs      = require('fs')
    , libxmljs = require('libxmljs')
    ;

// allow lots of emitters to be set to silence warning
app.setMaxListeners(0);

suite('export.shapefile', function() {

// SHP tests

test('SHP format, unauthenticated', function(done){
    assert.response(app, {
        url: '/api/v1/sql?q=SELECT%20*%20FROM%20untitle_table_4%20LIMIT%201&format=shp',
        headers: {host: 'vizzuality.cartodb.com'},
        encoding: 'binary',
        method: 'GET'
    },{ }, function(res){
        assert.equal(res.statusCode, 200, res.body);
        var cd = res.header('Content-Disposition');
        assert.equal(true, /^attachment/.test(cd), 'SHP is not disposed as attachment: ' + cd);
        assert.equal(true, /filename=cartodb-query.zip/gi.test(cd));
        var tmpfile = '/tmp/myshape.zip';
        var err = fs.writeFileSync(tmpfile, res.body, 'binary');
        if (err) { done(err); return }
        var zf = new zipfile.ZipFile(tmpfile);
        assert.ok(_.contains(zf.names, 'cartodb-query.shp'), 'SHP zipfile does not contain .shp: ' + zf.names);
        assert.ok(_.contains(zf.names, 'cartodb-query.shx'), 'SHP zipfile does not contain .shx: ' + zf.names);
        assert.ok(_.contains(zf.names, 'cartodb-query.dbf'), 'SHP zipfile does not contain .dbf: ' + zf.names);
        assert.ok(_.contains(zf.names, 'cartodb-query.prj'), 'SHP zipfile does not contain .prj: ' + zf.names);
        // TODO: check DBF contents
        fs.unlinkSync(tmpfile);
        done();
    });
});

test('SHP format, unauthenticated, POST', function(done){
    assert.response(app, {
        url: '/api/v1/sql',
        data: 'q=SELECT%20*%20FROM%20untitle_table_4%20LIMIT%201&format=shp',
        headers: {host: 'vizzuality.cartodb.com', 'Content-Type': 'application/x-www-form-urlencoded' },
        method: 'POST'
    },{ }, function(res){
        assert.equal(res.statusCode, 200, res.body);
        var cd = res.header('Content-Disposition');
        assert.equal(true, /^attachment/.test(cd), 'SHP is not disposed as attachment: ' + cd);
        assert.equal(true, /filename=cartodb-query.zip/gi.test(cd), 'Unexpected SHP filename: ' + cd);
        done();
    });
});

test('SHP format, big size, POST', function(done){
    assert.response(app, {
        url: '/api/v1/sql',
        data: querystring.stringify({
          q: 'SELECT 0 as fname, st_makepoint(i,i) FROM generate_series(0,81920) i',
          format: 'shp'
        }),
        headers: {host: 'vizzuality.cartodb.com', 'Content-Type': 'application/x-www-form-urlencoded' },
        method: 'POST'
    },{ }, function(res){
        assert.equal(res.statusCode, 200, res.body);
        var cd = res.header('Content-Disposition');
        assert.equal(true, /^attachment/.test(cd), 'SHP is not disposed as attachment: ' + cd);
        assert.equal(true, /filename=cartodb-query.zip/gi.test(cd), 'Unexpected SHP filename: ' + cd);
        assert.ok(res.body.length > 81920, 'SHP smaller than expected: ' + res.body.length);
        done();
    });
});

test('SHP format, unauthenticated, with custom filename', function(done){
    assert.response(app, {
        url: '/api/v1/sql?q=SELECT%20*%20FROM%20untitle_table_4%20LIMIT%201&format=shp&filename=myshape',
        headers: {host: 'vizzuality.cartodb.com'},
        encoding: 'binary',
        method: 'GET'
    },{ }, function(res){
        assert.equal(res.statusCode, 200, res.body);
        var cd = res.header('Content-Disposition');
        assert.equal(true, /^attachment/.test(cd), 'SHP is not disposed as attachment: ' + cd);
        assert.equal(true, /filename=myshape.zip/gi.test(cd));
        var tmpfile = '/tmp/myshape.zip';
        var err = fs.writeFileSync(tmpfile, res.body, 'binary');
        if (err) { done(err); return }
        var zf = new zipfile.ZipFile(tmpfile);
        assert.ok(_.contains(zf.names, 'myshape.shp'), 'SHP zipfile does not contain .shp: ' + zf.names);
        assert.ok(_.contains(zf.names, 'myshape.shx'), 'SHP zipfile does not contain .shx: ' + zf.names);
        assert.ok(_.contains(zf.names, 'myshape.dbf'), 'SHP zipfile does not contain .dbf: ' + zf.names);
        assert.ok(_.contains(zf.names, 'myshape.prj'), 'SHP zipfile does not contain .prj: ' + zf.names);
        fs.unlinkSync(tmpfile);
        done();
    });
});

test('SHP format, unauthenticated, with custom, dangerous filename', function(done){
    assert.response(app, {
        url: '/api/v1/sql?q=SELECT%20*%20FROM%20untitle_table_4%20LIMIT%201&format=shp&filename=b;"%20()[]a',
        headers: {host: 'vizzuality.cartodb.com'},
        encoding: 'binary',
        method: 'GET'
    },{ }, function(res){
        assert.equal(res.statusCode, 200, res.body);
        var fname = "b_______a";
        var cd = res.header('Content-Disposition');
        assert.equal(true, /^attachment/.test(cd), 'SHP is not disposed as attachment: ' + cd);
        assert.equal(true, /filename=b_______a.zip/gi.test(cd), 'Unexpected SHP filename: ' + cd);
        var tmpfile = '/tmp/myshape.zip';
        var err = fs.writeFileSync(tmpfile, res.body, 'binary');
        if (err) { done(err); return }
        var zf = new zipfile.ZipFile(tmpfile);
        assert.ok(_.contains(zf.names, fname + '.shp'), 'SHP zipfile does not contain .shp: ' + zf.names);
        assert.ok(_.contains(zf.names, fname + '.shx'), 'SHP zipfile does not contain .shx: ' + zf.names);
        assert.ok(_.contains(zf.names, fname + '.dbf'), 'SHP zipfile does not contain .dbf: ' + zf.names);
        assert.ok(_.contains(zf.names, fname+ '.prj'), 'SHP zipfile does not contain .prj: ' + zf.names);
        fs.unlinkSync(tmpfile);
        done();
    });
});

test('SHP format, authenticated', function(done){
    assert.response(app, {
        url: '/api/v1/sql?q=SELECT%20*%20FROM%20untitle_table_4%20LIMIT%201&format=shp&api_key=1234',
        headers: {host: 'vizzuality.cartodb.com'},
        encoding: 'binary',
        method: 'GET'
    },{ }, function(res){
        assert.equal(res.statusCode, 200, res.body);
        var cd = res.header('Content-Disposition');
        assert.equal(true, /filename=cartodb-query.zip/gi.test(cd));
        var tmpfile = '/tmp/myshape.zip';
        var err = fs.writeFileSync(tmpfile, res.body, 'binary');
        if (err) { done(err); return }
        var zf = new zipfile.ZipFile(tmpfile);
        assert.ok(_.contains(zf.names, 'cartodb-query.shp'), 'SHP zipfile does not contain .shp: ' + zf.names);
        assert.ok(_.contains(zf.names, 'cartodb-query.shx'), 'SHP zipfile does not contain .shx: ' + zf.names);
        assert.ok(_.contains(zf.names, 'cartodb-query.dbf'), 'SHP zipfile does not contain .dbf: ' + zf.names);
        assert.ok(_.contains(zf.names, 'cartodb-query.prj'), 'SHP zipfile does not contain .prj: ' + zf.names);
        // TODO: check contents of the DBF
        fs.unlinkSync(tmpfile);
        done();
    });
});


// See https://github.com/Vizzuality/CartoDB-SQL-API/issues/66
test('SHP format, unauthenticated, with utf8 data', function(done){
    var query = querystring.stringify({
        q: "SELECT '♥♦♣♠' as f, st_makepoint(0,0,4326) as the_geom",
        format: 'shp',
        filename: 'myshape'
      });
    assert.response(app, {
        url: '/api/v1/sql?' + query,
        headers: {host: 'vizzuality.cartodb.com'},
        encoding: 'binary',
        method: 'GET'
    },{ }, function(res){
        assert.equal(res.statusCode, 200, res.body);
        var tmpfile = '/tmp/myshape.zip';
        var err = fs.writeFileSync(tmpfile, res.body, 'binary');
        if (err) { done(err); return }
        var zf = new zipfile.ZipFile(tmpfile);
        var buffer = zf.readFileSync('myshape.dbf');
        fs.unlinkSync(tmpfile);
        var strings = buffer.toString();
        assert.ok(/♥♦♣♠/.exec(strings), "Cannot find '♥♦♣♠' in here:\n" + strings);
        done();
    });
});

// See https://github.com/Vizzuality/CartoDB-SQL-API/issues/66
test('mixed type geometry', function(done){
    var query = querystring.stringify({
        q: "SELECT 'POINT(0 0)'::geometry as g UNION ALL "
         + "SELECT 'LINESTRING(0 0, 1 0)'::geometry",
        format: 'shp'
      });
    assert.response(app, {
        url: '/api/v1/sql?' + query,
        headers: {host: 'vizzuality.cartodb.com'},
        encoding: 'binary',
        method: 'GET'
    },{ }, function(res){
        assert.deepEqual(res.headers['content-type'], 'application/json; charset=utf-8');
        assert.deepEqual(res.headers['content-disposition'], 'inline');
        assert.equal(res.statusCode, 400, res.statusCode + ': ' +res.body);
        var parsedBody = JSON.parse(res.body);
        var expectedBody = {"error":["ERROR 1: Attempt to write non-point (LINESTRING) geometry to point shapefile."]}
        assert.deepEqual(parsedBody, expectedBody);
        done();
    });
});

// See https://github.com/Vizzuality/CartoDB-SQL-API/issues/87
test('errors are not confused with warnings', function(done){
    var query = querystring.stringify({
        q: "SELECT 'POINT(0 0)'::geometry as g"
         + ", 1 as a_very_very_very_long_field_name"
         + " UNION ALL "
         + "SELECT 'LINESTRING(0 0, 1 0)'::geometry, 2",
        format: 'shp'
      });
    assert.response(app, {
        url: '/api/v1/sql?' + query,
        headers: {host: 'vizzuality.cartodb.com'},
        encoding: 'binary',
        method: 'GET'
    },{ }, function(res){
        assert.deepEqual(res.headers['content-type'], 'application/json; charset=utf-8');
        assert.deepEqual(res.headers['content-disposition'], 'inline');
        assert.equal(res.statusCode, 400, res.statusCode + ': ' +res.body);
        var parsedBody = JSON.parse(res.body);
        var expectedBody = {"error":["ERROR 1: Attempt to write non-point (LINESTRING) geometry to point shapefile."]}
        assert.deepEqual(parsedBody, expectedBody);
        done();
    });
});

test('skipfields controls fields included in SHP output', function(done){
    var query = querystring.stringify({
        q: "SELECT 111 as skipme, 222 as keepme, 'POINT(0 0)'::geometry as g",
        format: 'shp',
        skipfields: 'skipme',
        filename: 'myshape'
      });
    assert.response(app, {
        url: '/api/v1/sql?' + query,
        headers: {host: 'vizzuality.cartodb.com'},
        encoding: 'binary',
        method: 'GET'
    },{ }, function(res){
        assert.equal(res.statusCode, 200, res.body);
        var tmpfile = '/tmp/myshape.zip';
        var err = fs.writeFileSync(tmpfile, res.body, 'binary');
        if (err) { done(err); return }
        var zf = new zipfile.ZipFile(tmpfile);
        var buffer = zf.readFileSync('myshape.dbf');
        fs.unlinkSync(tmpfile);
        var strings = buffer.toString();
        assert.ok(!/skipme/.exec(strings), "Could not skip 'skipme' field:\n" + strings);
        done();
    });
});

test('SHP format, concurrently', function(done){
    var concurrency = 1;
    var waiting = concurrency;
    for (var i=0; i<concurrency; ++i) {
      assert.response(app, {
          url: '/api/v1/sql?q=SELECT%20*%20FROM%20untitle_table_4%20LIMIT%201&format=shp',
          headers: {host: 'vizzuality.cartodb.com'},
          encoding: 'binary',
          method: 'GET'
      },{ }, function(res){
          assert.equal(res.statusCode, 200, res.body);
          var cd = res.header('Content-Disposition');
          assert.equal(true, /^attachment/.test(cd), 'SHP is not disposed as attachment: ' + cd);
          assert.equal(true, /filename=cartodb-query.zip/gi.test(cd));
          var tmpfile = '/tmp/myshape.zip';
          var err = fs.writeFileSync(tmpfile, res.body, 'binary');
          if (err) { done(err); return }
          var zf = new zipfile.ZipFile(tmpfile);
          assert.ok(_.contains(zf.names, 'cartodb-query.shp'), 'SHP zipfile does not contain .shp: ' + zf.names);
          assert.ok(_.contains(zf.names, 'cartodb-query.shx'), 'SHP zipfile does not contain .shx: ' + zf.names);
          assert.ok(_.contains(zf.names, 'cartodb-query.dbf'), 'SHP zipfile does not contain .dbf: ' + zf.names);
          assert.ok(_.contains(zf.names, 'cartodb-query.prj'), 'SHP zipfile does not contain .prj: ' + zf.names);
          // TODO: check DBF contents
          fs.unlinkSync(tmpfile);
          if ( ! --waiting ) done();
      });
    }
});

// See https://github.com/CartoDB/CartoDB-SQL-API/issues/111
test('point with null first', function(done){
    var query = querystring.stringify({
        q: "SELECT null::geometry as g UNION ALL SELECT 'SRID=4326;POINT(0 0)'::geometry",
        format: 'shp'
      });
    assert.response(app, {
        url: '/api/v1/sql?' + query,
        headers: {host: 'vizzuality.cartodb.com'},
        encoding: 'binary',
        method: 'GET'
    },{ }, function(res){
        assert.equal(res.statusCode, 200, res.body);
        var cd = res.header('Content-Disposition');
        assert.equal(true, /filename=cartodb-query.zip/gi.test(cd));
        var tmpfile = '/tmp/myshape.zip';
        var err = fs.writeFileSync(tmpfile, res.body, 'binary');
        if (err) { done(err); return }
        var zf = new zipfile.ZipFile(tmpfile);
        assert.ok(_.contains(zf.names, 'cartodb-query.shp'), 'SHP zipfile does not contain .shp: ' + zf.names);
        assert.ok(_.contains(zf.names, 'cartodb-query.shx'), 'SHP zipfile does not contain .shx: ' + zf.names);
        assert.ok(_.contains(zf.names, 'cartodb-query.dbf'), 'SHP zipfile does not contain .dbf: ' + zf.names);
        assert.ok(_.contains(zf.names, 'cartodb-query.prj'), 'SHP zipfile does not contain .prj: ' + zf.names);
        // TODO: check contents of the DBF
        fs.unlinkSync(tmpfile);
        done();
    });
});

});
