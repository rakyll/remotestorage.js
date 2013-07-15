function(window){
var cEl = document.createElement.bind(document);

  function gCl(parent, className) {
    return parent.getElementsByClassName(className)[0];
  }
  function gTl(parent, className) {
    return parent.getElementsByTagName(className)[0];
  }
    
  function show(el, display) {
    if(typeof(display) === 'undefined') {
      display = 'block';
    }
    el.style.display = display;
    return el;
  }

  function hide(el) {
    show(el,'none');
    return el;
  }

  function removeClass(el, className) {
    return el.classList.remove(className);
  }

  function addClass(el, className) {
    return el.classList.add(className);
  }


  function View() {
    if(typeof(document) === 'undefined') {
      throw "Widget not supported";
    }
    RemoteStorage.eventHandling(this,
                                'connect',
                                'disconnect',
                                'sync',
                                'reconnect',
                                'display');

    this.display = function() {
      function toggle_bubble(event) {
        if(bubble.className.search('hidden') < 0) {
          hide_bubble(event);
        } else {
          show_bubble(event);
        }
      }
      
      function hide_bubble(){
        //console.log('hide bubble',bubble);
        addClass(bubble, 'hidden')
        document.body.removeEventListener('click', hide_bubble);
      }
      function show_bubble(event){
        //console.log('show bubble',bubble,event)
        removeClass(bubble, 'hidden');
        if(typeof(event) != 'undefined')
          event.cancelBubble = true;
        document.body.addEventListener('click', hide_bubble);
        gTl(bubble,'form').userAddress.focus();
      }
      if(typeof(this.widget) !== 'undefined')
        return this.widget;

      var element = cEl('div');
      var style = cEl('style');
      style.innerHTML = RemoteStorage.Assets.widgetCss;

      element.id = "remotestorage-widget";

      element.innerHTML = RemoteStorage.Assets.widget;


      element.appendChild(style);
      document.body.appendChild(element);

      var el;
      //sync button
      el = gCl(element, 'sync');
      gTl(el, 'img').src = RemoteStorage.Assets.syncIcon;
      el.addEventListener('click', this.events.sync.bind(this));

      //disconnect button
      el = gCl(element, 'disconnect');
      gTl(el, 'img').src = RemoteStorage.Assets.disconnectIcon;
      el.addEventListener('click', this.events.disconnect.bind(this));

      //connect button
      var cb = gCl(element,'connect');
      gTl(cb, 'img').src = RemoteStorage.Assets.connectIcon;
      cb.addEventListener('click', this.events.connect.bind(this));

      // input
      el = gTl(element, 'form').userAddress;
      el.addEventListener('keyup', function(event) {
        if(event.target.value) cb.removeAttribute('disabled');
        else cb.setAttribute('disabled','disabled');
      });

      //the cube
      el = gCl(element, 'cube');
      el.src = RemoteStorage.Assets.remoteStorageIcon;
      el.addEventListener('click', toggle_bubble);
      var bubble = gCl(element,'bubble');
      bubble.addEventListener('click', function(){
        show_bubble();
      })
      this.div = element;

      this.states.initial.call(this);
      this._emit('display');
      return this.div;
    };

    this.setState = function(state, args) {
      var s = this.states[state];
      if(typeof(s) === 'undefined') {
        throw new Error("Bad State assigned to view: " + state);
      }
      s.apply(this,args);
    };

    this.setUserAddress = function(addr) {
      this.userAddress = addr;
    };
  }

  View.prototype = {
    // States:
    //  initial      - not connected
    //  authing      - in auth flow
    //  connected    - connected to remote storage, not syncing at the moment
    //  busy         - connected, syncing at the moment
    //  offline      - connected, but no network connectivity
    //  error        - connected, but sync error happened
    //  unauthorized - connected, but request returned 401
    currentState : 'initial',
    states :  {
      initial : function(info) {
        if(!info)
          info = 'This app allows you to use your own storage! Find more info on <a href="http://remotestorage.io/" target="_blank">remotestorage.io';
        this.div.className = "remotestorage-state-initial";
        gCl(this.div, 'status-text').innerHTML = "Connect <strong>remotestorage</strong>";
        gCl(this.div, 'info').innerHTML = info;
        var cube = gCl(this.div, 'cube');
        removeClass(cube, 'remotestorage-loading')
        var bubble = this.div.querySelector('.bubble');
        if(! bubble.classList.contains('hidden')) {
          bubble.classList.add('hidden');
        }
      },
      authing : function() {
        this.div.className = "remotestorage-state-authing";
        gCl(this.div, 'status-text').innerHTML = "Connecting";
        addClass(gCl(this.div, 'cube'), 'remotestorage-loading'); //TODO needs to be undone when is that neccesary
      },
      connected : function() {
        this.div.className = "remotestorage-state-connected";
        gCl(this.div, 'userAddress').innerHTML = this.userAddress;
        var cube = gCl(this.div, 'cube');
        cube.src = RemoteStorage.Assets.remoteStorageIcon;
        removeClass(cube, 'remotestorage-loading');
      },
      busy : function() {
        this.div.className = "remotestorage-state-busy";
        addClass(gCl(this.div, 'cube'), 'remotestorage-loading'); //TODO needs to be undone when is that neccesary
      },
      offline : function() {
        this.div.className = "remotestorage-state-offline";
        gCl(this.div, 'cube').src = RemoteStorage.Assets.remoteStorageIconOffline;
      },
      error : function(err) {
        if(err){}
        this.div.className = "remotestorage-state-error";
        gCl(this.div, 'bubble-text').innerHTML = 'ERROR'
        gCl(this.div, 'error-msg').innerHTML = err;
        gCl(this.div, 'cube').src = RemoteStorage.Assets.remoteStorageIconError;
      },
      unauthorized : function() {
        this.div.className = "remotestorage-state-unauthorized";
      }
    },
    events : {
      connect : function(event) {
        event.preventDefault();
        this._emit('connect', gTl(this.div, 'form').userAddress.value);
      },
      sync : function(event) {
        event.preventDefault();
        this._emit('sync');
      },
      disconnect : function(event) {
        event.preventDefault();
        this._emit('disconnect');
      },
      // FIXME: what are these???
      reconnect : function() {},
      display : function() {}
    }
  };

}.bind(this);