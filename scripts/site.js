Y.use('node', 'squarespace-gallery-ng' ,'squarespace-image-loader', function(Y) {

  window.Site = Singleton.create({

    ready: function() {
      this.slideshow = null;
      this.thumbnails = null;

      Y.on('domready', this.initialize, this);

      Y.one(window).on('resize', function() {
        this.checkHeaderHeight();
        this.setSidebarFixed();
      }, this);

    },

    initialize: function() {
      this.setupNavigation();

      this.setSidebarFixed();

      if (Y.one('body.collection-type-gallery')) {
        this.setupGalleries();

        this.checkHeaderHeight();
      }
      
      this.setupTweakHandlers();

      this.handleAnnouncementBar();

      Y.all('.main-image img[data-src]').each(function(img) {
        ImageLoader.load(img, { load: true });
      });

    },

    setSidebarFixed: function() {
      if(Y.one('.sidebar-fixed')){
        if (Y.one('body').get('winWidth') < Y.one('#canvas').get('offsetWidth')){
          Y.one('#headerWrapper').addClass('absolute');
        } else {
          Y.one('#headerWrapper').removeClass('absolute');
        }
      }
    },

    setupNavigation: function() {
      // NAV DROPDOWNS //////////////////////////////////////////

      /* on click*/
      Y.all('nav.dropdown-click > ul').each( function(n) {
        n.delegate('click', function(e){
          folderToggle(e.currentTarget.next('.subnav'));
        }, 'li.folder a');
      });

      // OCV = open/close velocity (smaller is slower)
      var OCV = 50;

      function folderOpen (ddSubnav) {
        if (!ddSubnav.ancestor('li.folder').hasClass('dropdown-open')) {
          new Y.Anim({
            node: ddSubnav,
            to: {
              opacity: 1,
              height: ddSubnav.one('ul').get('offsetHeight')
            },
            duration: (parseInt(ddSubnav.one('ul').get('offsetHeight'),10) / OCV) / 10,
            easing: 'easeOutStrong'
          }).run().on('end', function() {
            ddSubnav.ancestor('li.folder').addClass('dropdown-open');
          });
        }
      }

      function folderClose (ddSubnav) {
        if (ddSubnav.ancestor('li.folder').hasClass('dropdown-open')) {
          new Y.Anim({
            node: ddSubnav,
            to: {
              opacity: 1,
              height: 0
            },
            duration: (parseInt(ddSubnav.one('ul').get('offsetHeight'),10) / OCV) / 10,
            easing: 'easeOutStrong'
          }).run().on('end', function() {
            ddSubnav.ancestor('li.folder').removeClass('dropdown-open');
          });
        }
      }

      function folderToggle (ddSubnav) {

        if (ddSubnav.ancestor('li.folder').hasClass('dropdown-open')) {
          folderClose(ddSubnav);
        } else {
          Y.all('li.dropdown-open .subnav').each(function(n){
            folderClose(n);
          });
          folderOpen(ddSubnav);
        }
      }

      // Mobile Nav ///////////////////////////////////

       Y.one('#mobileMenuLink a').on('click', function(e){
         var mobileMenuHeight = parseInt(Y.one('#mobileNav .wrapper').get('offsetHeight'),10);
         if (Y.one('#mobileNav').hasClass('menu-open')) {
           new Y.Anim({ node: Y.one('#mobileNav'), to: { height: 0 }, duration: 0.2, easing: 'easeOutStrong' }).run();
         } else {
           new Y.Anim({ node: Y.one('#mobileNav'), to: { height: mobileMenuHeight }, duration: 0.2, easing: 'easeOutStrong' }).run();
         }

         Y.one('#mobileNav').toggleClass('menu-open');
       });


      // SIDEBAR min-height set

      function setPageHeight() {
        var sidebarHeight = 0;
        var headerH = 0;
        if (parseInt(Y.one('#sidebarWrapper').getComputedStyle('height'),10)) {
          sidebarHeight = parseInt(Y.one('#sidebarWrapper').getComputedStyle('height'),10);
        }
        if (parseInt(Y.one('#headerWrapper').getComputedStyle('height'),10)) {
          headerH = parseInt(Y.one('#headerWrapper').getComputedStyle('height'),10);
        }
        Y.one('#page').setStyle('minHeight', (sidebarHeight + headerH) + 'px');
      }

      setPageHeight();
    },

    setupTweakHandlers: function() {

      // ALL PAGES //////////////////////////////////////////////////////

      if (!Y.Global) {
        return;
      }

      Y.Global.on('tweak:change', function(f){
        var tweakName = f.getName();

        if (tweakName == 'blogSidebarWidth' ) {
          this.setPageHeight();
        } else if (tweakName == 'galleryPadding') {
          Y.one('#slideshowWrapper').setStyle('height', (parseInt(Y.one('body').getComputedStyle('height'),10) - (2 * parseInt(f.getValue(), 10))) + 'px');
          this.slideshow && this.slideshow.refresh();
        } else if (tweakName == 'gallery-style') {
          this.slideshow && this.slideshow.getImages().each(function(img) {
            img.loader.setAttrs({
              fit: f.getValue() === 'Fit', 
              fill: f.getValue() === 'Fill'
            });
          });
        } else if (tweakName == 'thumbnail-aspect-ratio') {
          var aspectRatio = this.getAspectRatio(f.getValue());
          this.thumbnails && this.thumbnails.set('aspectRatio', aspectRatio);

          // reset images if switching to auto mode
          if (aspectRatio === 0) {
            this.thumbnails && this.thumbnails.getImages().each(function(img) {
              img.setStyles({
                top: null,
                left: null
              });
            });
          }
        } else if (tweakName == 'thumbnailWidth') {
          this.thumbnails && this.thumbnails.set('columnWidth', parseInt(f.getValue()));          
        }

        // show thumbs if hidden
        if (tweakName.match(/thumbnail/i) && !Y.one('body.thumbnail-view')) {
          this.showThumbnails();
        }

      }, this);

      Y.Global.on('tweak:reset', function(f){
        this.slideshow && Y.later(1000, this, function() { this.slideshow.refresh(); });
      }, this);

      Y.Global.on('tweak:close', function(){
        this.slideshow && Y.later(1000, this, function() { this.slideshow.refresh(); });
        this.thumbnails && Y.later(1000, this, function() { this.thumbnails.refresh(); });
      }, this);

    },

    getBodyWidth: function() {
      return parseInt(Y.one('body').getComputedStyle('width'),10);
    },

    getAspectRatio: function(tweakValue) {
      var aspectRatio = 0,
          matches = tweakValue && tweakValue.match(/(\d+):(\d+)/);

      if (matches && matches.length === 3) {
        aspectRatio = matches[1]/matches[2];
      }

      return aspectRatio;
    },

    setupGalleries: function() {

      if (this.getBodyWidth() < 800) {

        Y.all('#slideshow .slide img[data-src]').each(function(img) {
          ImageLoader.load(img.removeAttribute('data-load'));
        });

        Y.all('#slideshow .sqs-video-wrapper').each(function(videoWrapper) {
          videoWrapper.plug(Y.Squarespace.VideoLoader);
          videoWrapper.videoloader.set('mode','none');
        });

        Y.one(window).on('resize', function(e){
          if (this.getBodyWidth() >= 800 && !this.slideshow) {
            this.setupGalleries();
          }
        }, this);

      } else {

        if (Y.one('body.enable-gallery-thumbnails.initial-gallery-view-thumbnails') || Y.one('body.enable-gallery-thumbnails.homepage.homepage-gallery-view-thumbnails')) {
          if (!Y.one('body.enable-gallery-thumbnails.homepage.homepage-gallery-view-slideshow')) {
            if (window.location.hash) {
              this.setupSlideshow();
              Y.later(100, this, function() {
                Y.one('body').removeClass('thumbnail-view').set('scrollTop', 0);
                this.slideshow.refresh();
                Y.all(".sqs-video-wrapper").each(function(video) { video.videoloader.reload(); });            
                this.checkHeaderHeight();
              });
            } else {
              this.showThumbnails();
            }
          } else {
            this.setupSlideshow();
          }
        } else {
          this.setupSlideshow();
        }

        Y.all('.thumbnail-toggle').each(function(node) {
          node.on('click', function(e){
            this.showThumbnails();
          }, this);
        }, this);

        // if you click on a gallery thumb
        Y.one('#thumbnails').delegate('click', function(e){
          var index = Y.all('.thumb').indexOf(e.currentTarget);

          if (!this.slideshow) {
            this.setupSlideshow(index);
          } else {
            this.slideshow.set('currentIndex', index);
          }

          Y.later(100, this, function() {
            Y.one('body').removeClass('thumbnail-view').set('scrollTop', 0);
            this.slideshow.refresh();
            Y.all(".sqs-video-wrapper").each(function(video) { video.videoloader.reload(); });            
            this.checkHeaderHeight();
            history.pushState && history.pushState('itemId', null, Y.one('.sqs-active-slide').getData('slide-url'));
          });

        }, '.thumb', this);

      }

      Y.one('#galleryWrapper .meta').setStyle('opacity', 1);

    },

    setupThumbnailGrid: function() {
      if (this.thumbnails) return;

      this.thumbnails = new Y.Squarespace.Gallery2({
        container: Y.one('#thumbnails'),
        element: Y.all('.thumb'),
        design: 'autocolumns',
        designOptions: {
          columnWidth: parseInt(Y.Squarespace.Template.getTweakValue('@thumbnailWidth')),               
          columnWidthBehavior: 'min',     
          gutter: 10,                     
          aspectRatio: this.getAspectRatio(Y.Squarespace.Template.getTweakValue('thumbnail-aspect-ratio'))
        },
        lazyLoad: true,
        refreshOnResize: true
      });

    },

    setupSlideshow: function(index) {

      if (this.slideshow) return;

      if (Y.Squarespace.Template.getTweakValue('galleryPadding')) {
        Y.one('#slideshowWrapper').setStyle('height', (parseInt(Y.one('body').getComputedStyle('height'),10) - (2 * parseInt(Y.Squarespace.Template.getTweakValue('galleryPadding'), 10))) + 'px');
      }

      if(Y.one('#slideshow .slide')) {
        var galleryStyle = 'fit';

        if(Y.Squarespace.Template.getTweakValue('gallery-style')) {
          galleryStyle = Y.Squarespace.Template.getTweakValue('gallery-style').toLowerCase();
        }

        // slideshow gallery
        this.slideshow = new Y.Squarespace.Gallery2({
          container: '#slideshow',
          currentIndex: index || 0,
          element: Y.all('.slide'),
          loop: true,
          elements: {
            next: '.next-slide, .right-control',
            previous: '.prev-slide, .left-control',
            controls: '#dotControls, #numberControls'
          },
          design: 'stacked',
          designOptions: {
            autoHeight: false,
            speed: 0.6
          },
          loaderOptions: {
            mode: galleryStyle
          },
          historyHash: true
        });

        // linked gallery = image data
        var imageData = new Y.Squarespace.Gallery2({
          container: '#imageData',
          currentIndex: this.slideshow.get('currentIndex'),
          loop: true,
          keyboard: false,
          design: 'base'
        });

        this.slideshow.addChild(imageData);

        if (Y.all('#slideshow .slide').size() <= 1) {
          Y.all('.gallery-controls').setStyle('display','none');
        }
      }

      Y.one(window).on('resize', function(e){
        if (Y.Squarespace.Template.getTweakValue('galleryPadding')) {
          Y.one('#slideshowWrapper').setStyle('height', (parseInt(Y.one('body').getComputedStyle('height'),10) - (2 * parseInt(Y.Squarespace.Template.getTweakValue('galleryPadding'), 10))) + 'px');
        }
        if (this.slideshow) {
          this.slideshow.refresh({
            type: 'resize'
          });
        }        
      }, this);

    },

    showThumbnails: function() {
      Y.one('body').addClass('thumbnail-view');

      if (this.thumbnails) {
        this.thumbnails.refresh();
      } else {
        this.setupThumbnailGrid();              
      }

      if (window.history) {
        window.history.replaceState('itemId', null, Static.SQUARESPACE_CONTEXT.collection.fullUrl);
      }
    },

    /*
    setGalleryPostHeight: function() {

      Y.all('.post-type-gallery').each( function(post) {
        var slides = post.all('.slide');

        if (slides.size() > 0) {
          var imageH = parseInt(slides.item(0).one('img').getAttribute('data-image-dimensions').split('x')[1], 10);
          var imageW = parseInt(slides.item(0).one('img').getAttribute('data-image-dimensions').split('x')[0], 10);
        }

        if (slides.size() > 1) {

          // set slideshow dimensions to match first image (if horizontal)
          if (imageH/imageW < 1) {
            slideshowHeight = (post.one('.slideshow').get('offsetWidth') * imageH) / imageW;
            post.one('.slideshow').setStyle('height', slideshowHeight + 'px');
          }

        } else {

          slideshowHeight = (post.one('.slideshow').get('offsetWidth') * imageH) / imageW;
          post.one('.slideshow').setStyle('height', slideshowHeight + 'px');
          new Y.Squarespace.Loader({
            img:post.one('img[data-src]')
          });

        }
      });

    }, */

    checkHeaderHeight: function() {

      var canvasHeight = parseInt(Y.one('#canvasWrapper').getComputedStyle('height'),10);
      var headerHeight = parseInt(Y.one('#header').get('offsetHeight'),10);
      var canvasPadding = parseInt(Y.one('#canvas').getStyle('paddingTop'),10)*2;

      var folderHeight = 0;
      if (Y.all('#header .subnav').size() > 0) {
        Y.all('#header .subnav ul').each(function(n) {
          folderHeight = Math.max(folderHeight, parseInt(n.getComputedStyle('height'), 10));
        });
      }

      var metaHeight = 0;
      if (Y.all('#imageData .slide-meta-wrapper').size() > 0) {
        Y.all('#imageData .slide-meta-wrapper').each(function(n) {
          metaHeight = Math.max(metaHeight, n.get('offsetHeight'));
        });
      }

      var controlsHeight = 0;
      if (Y.all('.gallery-controls').size() > 0) {
        Y.all('.gallery-controls').each(function(n) {
          controlsHeight = Math.max(controlsHeight, n.get('offsetHeight'));
        });
      }

      if(canvasHeight <= headerHeight+folderHeight+canvasPadding+metaHeight+controlsHeight){
        Y.one('body').addClass('hide-meta');
      } else {
        Y.one('body').removeClass('hide-meta');
      }

    },

    handleAnnouncementBar: function () {

      var bar = Y.one('.sqs-announcement-bar');
      var close = Y.one('.sqs-announcement-bar-close');
      var header = Y.one('#headerWrapper');

      if (bar) {
        header && header.setStyles({
          marginTop: bar.get('clientHeight')
        });

        close && close.on('click', function () {
          header.setStyles({
            marginTop: 0
          });
        });
      }

    }

  });

});