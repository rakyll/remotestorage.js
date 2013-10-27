if(typeof(define) !== 'function'){
  var define = require('amdefine')(module);
}
define(['requirejs'], function(requirejs){
  var suites = [];
  suites.push({
    name: 'InMemoryStorage',
    desc: 'inmemory caching as a fallback for indexdb and localstorge',
    setup: function(env, test) {
      require('./lib/promising');
      global.RemoteStorage = function(){};
      require('./src/eventhandling');
      if( global.rs_eventhandling ){
        RemoteStorage.eventHandling = global.rs_eventhandling
      } else {
        global.rs_eventhandling = RemoteStorage.eventHandling;
      }
      require('./src/inmemorystorage');
      test.done();
    },

    beforeEach: function(env, test) {
      env.ims = new RemoteStorage.InMemoryStorage();
      test.done();
    },

    tests: [
      {
        desc: "#get loads a node",
        run: function(env, test) {
          var node = { 
            body: 'bar', 
            contentType: 'text/plain',
            revision: 'someRev'
          };
          env.ims._storage['/foo'] = node;
          env.ims.get('/foo').then(function(status, body, 
                                           contentType, revision) {
            test.assertAnd(status, 200);
            test.assertAnd(body, node.body);
            test.assertAnd(contentType, node.contentType);
            test.assertAnd(revision, node.revision);
            test.done();
          })
        }
      },
      
      {
        desc: "#get yields 404 when it doesn't find a node",
        run: function(env, test){
          env.ims.get('/bar').then(function(status){
            test.assert(status,404);
          })
        }
      },
      
      {
        desc: "#put yields 200 and stores the node",
        run: function(env, test) {
          env.ims.put('/foo', 'bar', 'text/plain').then(function(status) {
            test.assertAnd(status, 200);
            test.assertAnd(env.ims._storage['/foo'].path,'/foo');
            test.assertAnd(env.ims._storage['/foo'].contentType,'text/plain');
            test.assertAnd(env.ims._storage['/foo'].body,'bar');
            test.assertAnd(env.ims._storage['/foo'], {path:'/foo',body:'bar',contentType:'text/plain'});
            test.done();
          });
        }
      },

      {
        desc: "#put updates parent directories",
        run: function(env, test){
          env.ims.put('/foo/bar/baz', 'bar', 'text/plain').then(function(status){
            test.assertAnd(env.ims._storage['/foo/bar/'], {
              body: { 'baz': true },
              contentType: 'application/json',
              path: '/foo/bar/'
            }, 'storagae holds '+JSON.stringify(env.ims._storage['/foo/bar/'])+' at foo/bar');
            test.assertAnd(env.ims._storage['/foo/'], {
              body: { 'bar/': true },
              contentType: 'application/json',
              path: '/foo/'
            });
            
            test.assertAnd(env.ims._storage['/'], {
              body: { 'foo/': true },
              contentType: 'application/json',
              path: '/'
            });
            test.done();
          })
        }
      },
      
      {
        desc: "#put doesn't overwrite parent directories",
        run: function(env, test){
          env.ims.put('/foo/bar/baz', 'bla', 'text/pain').then(function(){
            env.ims.put('/foo/bar/bor', 'blub', 'text/plain').then(function(){
              test.assert(env.ims._storage['/foo/bar/'],{
                body: {'baz': true, 'bor': true},
                contentType: 'application/json',
                path: '/foo/bar/'
              })
            })
          })
        }
      },

      {
        desc: "#delete removes the node and empty parents",
        run: function(env, test) {
           env.ims.put('/foo/bar/baz', 'bla', 'text/pain').then(function(){
             test.assertAnd(Object.keys(env.ims._storage), ['/foo/bar/baz', 
                                                    '/foo/bar/', 
                                                    '/foo/', 
                                                    '/'],'wrong nodes after put : '+Object.keys(env.ims._storage));
             env.ims.delete('/foo/bar/baz').then(function(status) {
               test.assertAnd(status, 200, 'wrong status code : '+status);
               test.assertAnd(Object.keys(env.ims._storage), [], 'wrong nodes after delete : '+Object.keys(env.ims._storage));
               test.done();
             })
           })
        }
      },
      
      {
        desc: "#delete doesn't remove nonempty nodes",
        run: function(env, test) {
          env.ims.put('/foo/bar/baz', 'bla', 'text/pain').then(function() {
            env.ims.put('/foo/baz', 'bla', 'text/pain').then(function() {
              env.ims.delete('/foo/bar/baz').then(function(status) {
                test.assertAnd(Object.keys(env.ims._storage).sort(), ['/', '/foo/', '/foo/baz'], 'wrong nodes after delete '+Object.keys(env.ims._storage).sort());
                test.assertAnd(env.ims._storage['/foo/'], {
                  path: '/foo/',
                  body: {'baz': true},
                  contentType: 'application/json'
                }, 'found ' +JSON.stringify(env.ims._storage['/foo/'])+'instead of '+JSON.stringify({
                  path: '/foo/',
                  body: {'baz': true},
                  contentType: 'applicaton/json'
                }));
                test.done();
              })
            })
          });
        }
      },

      {
        desc: "#put records a change for outgoing changes",
        run: function(env, test) {
          env.ims.put('/foo/bla', 'basdf', 'text/plain').then(function() {
            test.assert(env.ims._changes['/foo/bla'], {
              action: 'PUT',
              path: '/foo/bla'
            });
          });
        }
      },

      {
        desc: "#put doesn't record a change for incoming changes",
        run: function(env, test) {
          env.ims.put('/foo/bla', 'basdf', 'text/plain', true).then(function() {
            test.assertType(env.ims._changes['/foo/bla'], 'undefined');
          });
        }
      },
      
      {
        desc: "#delete records a change for outgoing changes",
        run: function(env, test) {
          env.ims.put('/foo/bla', 'basdf', 'text/plain', true).then(function() {
            env.ims.delete('/foo/bla').then(function(){
              test.assert(env.ims._changes['/foo/bla'], {
                action: 'DELETE',
                path: '/foo/bla'
              });
            });
          });
        }
      },

      {
        desc: "#put doesn't record a change for incoming changes",
        run: function(env, test) {
          env.ims.put('/foo/bla', 'basdf', 'text/plain', true).then(function() {
            env.ims.delete('/foo/bla', true).then(function(){
          
              test.assertType(env.ims._changes['/foo/bla'], 'undefined');
            });
          });
        }
      },

      {
        desc: "#put fires a 'change' with origin=window for outgoing changes",
        timeout: 250,
        run: function(env, test) {
          env.ims.on('change', function(event) {
            test.assert(event, {
              path: '/foo/bla',
              origin: 'window',
              oldValue: undefined,
              newValue: 'basdf'
            });
          })
          env.ims.put('/foo/bla', 'basdf', 'text/plain');
        }
      },

      {
        desc: "#put fires a 'change' with origin=remote for incoming changes",
        run: function(env, test) {
          env.ims.on('change', function(event) {
            test.assert(event, {
              path: '/foo/bla',
              origin: 'remote',
              oldValue: undefined,
              newValue: 'adsf'
            });
          });
          env.ims.put('/foo/bla', 'adsf', 'text/plain', true);
        }
      },
      
      {
        desc: "#put attaches the newValue and oldValue correctly for updates",
        run: function(env, test) {
          var i = 0;
          env.ims.on('change', function(event) {
            i++;
            if(i == 1) {
              test.assertAnd(event, {
                path: '/foo/bla',
                origin: 'remote',
                oldValue: undefined,
                newValue: 'basdf'
              });
            } else if(i == 2) {
              test.assertAnd(event, {
                path: '/foo/bla',
                origin: 'window',
                oldValue: 'basdf',
                newValue: 'fdsab'
              });
              setTimeout(function() {
                test.done();
              }, 0);

            } else {
              console.error("UNEXPECTED THIRD CHANGE EVENT");
              test.result(false);
            }
          });
          env.ims.put('/foo/bla', 'basdf', 'text/plain', true).then(function() {
            env.ims.put('/foo/bla', 'fdsab', 'text/plain');
          });
        }
      }


      

    ]
    
  })
  return suites;
});
