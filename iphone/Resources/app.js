/*var win = Ti.UI.createWindow({
        backgroundColor: '#fff'
    });
    
    var textField = Ti.UI.createTextField({
        top: 120,
        hintText: 'Trigger',
        backgroundColor: 'yellow',
        //enabled: false
    });
    
    textField.addEventListener('touchstart', function() {
        Ti.API.info('touchstart event fired');
    });
    
    textField.addEventListener('click', function() {
        Ti.API.info('click event fired');
    });
    
    win.add(textField);
    win.open();
    */

/*    
var items = 
[
  {
    title : 'ListView (TIMOB-25646)',
    message : 'In search result click on any row, it should show loader',
    functionName : Test0
  },
  {
      title : 'ListView (TIMOB-25645)',
      message : 'In search result click on last item it should log right index.',
      functionName : Test1
  },
  {
      title : 'ListView (Without Navigation Bar)',
      message : 'Start search. UI should be proper.',
      functionName : Test2
  },
  {
      title : 'ListView (With Navigation bar)',
      message : 'In searchbar start typing, it should show a blue colored view on top.',
      functionName : Test3
  },
  {
      title : 'ListView (With Tabbar)',
      message : 'Start search. UI should be proper.',
      functionName : Test4
  },
  {
      title : 'ListView (Searchbar is not part of list view)',
      message : 'Start search. UI should be proper.',
      functionName : Test5
  },
  {
      title : 'ListView (Above a view having marigin)',
      message : 'Start search. UI should be proper.',
      functionName : Test6
  },
  {
      title : 'ListView (TIMOB-25622)',
      message : 'All list item should visible.',
      functionName : Test7
  },
  {
      title : 'ListView (Push view in navigation)',
      message : 'In searchresult click on a row it should push view.',
      functionName : Test8
  },
  {
      title :'ListView (open window)',
      message : 'In search result click on a rowit should open a new window.',
      functionName : Test9
  },
  {
      title : 'Tableview (Having some marigins)',
      message : 'Start search. UI should be proper.',
      functionName : Test10
  },
  {
      title :'TableView (open window)',
      message : 'In search result click on a row, it should open a new window.',
      functionName : Test11
  },
  {
      title : 'TableView (Push view in navigation)',
      message : 'In searchresult click on a row it should push view.',
      functionName : Test12
  },
  {
      title : 'TableView (show view on top)',
      message : 'In searchbar start typing,should show blue colored view on top.',
     functionName : Test13
  },
  {
      title : 'TableView (Row property change)',
      message : 'In search result,mentioned action in table data should happen.',
      functionName : Test14
  },
  {
      title : 'TableView (TIMOB-25622)',
      message : 'All list item should visible.',
     functionName : Test15
  },
  {
      title : 'TableView (With Navigation Bar)',
      message : 'Start search. UI should be proper.',
      functionName : Test16
  },
  {
      title : 'TableView (With Tabbar)',
      message : 'Start search. UI should be proper.',
      functionName : Test17
  },
  {
      title : 'TableView (TIMOB-25646)',
      message : 'In search result click on any row, it should show loader',
     functionName : Test18
  }
];
var rows = [];
for (var i = 0; i < items.length; i++) {
   var data = items[i];
  rows.push({ properties: {title:data.title, height: 60, subtitle: data.message, backgroundColor: 'white'}, template:Ti.UI.LIST_ITEM_TEMPLATE_SUBTITLE});
}

var win = Ti.UI.createWindow({
  title: 'TEST',
  backgroundColor: 'white',
  layout: 'vertical'
}); 
var ls = Ti.UI.createListSection({
  items: rows,
  sectionHeaderTitle: 'Section header',
});
 var lv = Ti.UI.createListView({
  top: 20,
  sections: [ls],
});
 
lv.addEventListener('itemclick', function(e) {
    Ti.API.info('click at index: ' + e.itemIndex);
    var clickedItem = items[e.itemIndex];
    clickedItem.functionName();
  });
win.add(lv);
win.open();

function Test0() {
  var rows = [];
  for (var i = 0; i < 20; i++) {
    var title = i ? 'Row '+ i : 'Close Window'
    rows.push({ properties: { title:title  , backgroundColor: 'red', searchableText:title}});
  }
  var win = Ti.UI.createWindow({
    title: 'TEST',
    backgroundColor: '#ffffff',
  }); 
  var sb = Ti.UI.createSearchBar();
   
  var ls = Ti.UI.createListSection({
    items: rows
  });
   var lv = Ti.UI.createListView({
    sections: [ls],
    searchView: sb,
  });
   
  sb.setHintText("test");
  sb.addEventListener('change', function(e){
    Ti.API.info(e.value);
  });
  sb.addEventListener('return', function(e){
    sb.blur();
  });
  lv.addEventListener('itemclick', function(e) {
    Ti.API.info('click at index: ' + e.itemIndex);
    if (e.itemIndex == 0) {
      navWin.close();
    } else {
      sb.blur();
      widgetView.visible = true;
      activityIndicator.show();
    }
  });

  var widgetView = Ti.UI.createView({
  backgroundColor : 'yellow',
  visible : false,
  elevation: 24,
  opacity: '20%'
  });

  var activityIndicator = Ti.UI.createActivityIndicator({
    color: 'green',
    font: {fontFamily:'Helvetica Neue', fontSize:26, fontWeight:'bold'},
    message: 'Loading...',
    style: Ti.UI.ActivityIndicatorStyle.DARK,
    top:10,
    left:10,
    height:Ti.UI.SIZE,
    width:Ti.UI.SIZE
  });

  var button = Ti.UI.createButton({
    title : 'Close',
    bottom : 30
  });

  button.addEventListener('click', function(e){
    widgetView.visible = false;
    activityIndicator.hide();
  });

  widgetView.add(activityIndicator);
  win.add(lv);
  win.add(widgetView);
  win.add(button);
  var navWin = Ti.UI.iOS.createNavigationWindow({window: win});
  navWin.open();
}

function Test1() {
  var rows = [];
  for (var i = 0; i < 40; i++) {
    var title = i ? 'Row '+ i : 'Close Window'
    rows.push({ properties: { title:title  , backgroundColor: 'red', searchableText:title}});
  }
  var win = Ti.UI.createWindow({
  title: 'TEST',
  backgroundColor: 'white',
  layout: 'vertical'
  }); 
  var sb = Ti.UI.createSearchBar();

  var ls = Ti.UI.createListSection({
  items: rows,
  sectionHeaderTitle: 'Section header',
  });
  var lv = Ti.UI.createListView({
    sections: [ls],
    searchView: sb,
  });

  sb.setHintText("test");
  sb.addEventListener('change', function(e){
  Ti.API.info(e.value);
  });
  //when the return key is hit, remove focus from our searchBar
  sb.addEventListener('return', function(e){
  sb.blur();
  });
  lv.addEventListener('itemclick', function(e) {
    Ti.API.info('click at index: ' + e.itemIndex);
    var item = e.section.getItemAt(e.itemIndex);
    if (e.itemIndex == 0) {
      navWin.close();
    };
  });
  win.add(lv);
  var navWin = Ti.UI.iOS.createNavigationWindow({window: win});
  navWin.open();
}

function Test2() {
    // without navigation bar
  var rows = [];
  for (var i = 0; i < 20; i++) {
    var title = i ? 'Row '+ i : 'Close Window'
    rows.push({ properties: { title:title  , backgroundColor: 'red', searchableText:title}});
  }
  var win = Ti.UI.createWindow({
    title: 'TEST',
    backgroundColor: '#ffffff',
  }); 
  var sb = Ti.UI.createSearchBar();
   
  var ls = Ti.UI.createListSection({
    items: rows
  });
   
   var lv = Ti.UI.createListView({
      top : 100,
      left : 20,
      sections: [ls],
      searchView: sb,
      resultsBackgroundColor: 'green',
      resultsSeparatorColor: 'blue'
  });
   
   sb.setHintText("test");
   sb.addEventListener('change', function(e){
    Ti.API.info(e.value);
  });
   
   //when the return key is hit, remove focus from our searchBar
  sb.addEventListener('return', function(e){
    sb.blur();
  });
  lv.addEventListener('itemclick', function(e) {
      Ti.API.info('click at index: ' + e.itemIndex);
      if (e.itemIndex == 0) {
      win.close();
    };
  });
   
  win.add(lv);
  win.open();
}

function Test3() {
  var rows = [];
  for (var i = 0; i < 20; i++) {
    var title = i ? 'Row '+ i : 'Close Window'
    rows.push({ properties: { title:title  , backgroundColor: 'red', searchableText:title}});
  }
  var win = Ti.UI.createWindow({
  title: 'TEST',
  backgroundColor: 'white',
  layout: 'vertical'
  }); 
  var sb = Ti.UI.createSearchBar();

  var ls = Ti.UI.createListSection({
  items: rows,
  sectionHeaderTitle: 'Section header',
  });
  var lv = Ti.UI.createListView({
    sections: [ls],
    searchView: sb,
  });

  sb.setHintText("test");
  sb.addEventListener('change', function(e){
   view.setHeight(50);
  Ti.API.info(e.value);
  });
  //when the return key is hit, remove focus from our searchBar
  sb.addEventListener('return', function(e){
    view.setHeight(0);

  sb.blur();
  });
  lv.addEventListener('itemclick', function(e) {
    Ti.API.info('click at index: ' + e.itemIndex);
    var item = e.section.getItemAt(e.itemIndex);
    if (e.itemIndex == 0) {
      navWin.close();
    };
  });

  var view = Ti.UI.createView({
  backgroundColor : 'blue',
  height : 0,
  });
  win.add(view);
  win.add(lv);
  var navWin = Ti.UI.iOS.createNavigationWindow({window: win});
  navWin.open();
}

function Test4() {
    // With tab bar
  var rows = [];
  for (var i = 0; i < 20; i++) {
    var title = i ? 'Row '+ i : 'Close Window'
    rows.push({ properties: { title:title  , backgroundColor: 'red', searchableText:title}});
  }
  var win1 = Ti.UI.createWindow({
    title: 'TEST',
    backgroundColor: '#ffffff',
  }); 
  var sb = Ti.UI.createSearchBar();
   
  var ls = Ti.UI.createListSection({
    items: rows
  });
   
   var lv = Ti.UI.createListView({
      top : 20,
      left : 50,
      right : 20,
      sections: [ls],
      searchView: sb,
      resultsBackgroundColor: 'green',
  });
   
  sb.setHintText("test");
   sb.addEventListener('change', function(e){
    Ti.API.info(e.value);
  });
   
   //when the return key is hit, remove focus from our searchBar
  sb.addEventListener('return', function(e){
    sb.blur();
  });
  lv.addEventListener('itemclick', function(e) {
      Ti.API.info('click at index: ' + e.itemIndex);
    if (e.itemIndex == 0) {
      tabGroup.close();
    };
  });
   
  win1.add(lv);
   
  var win2 = Ti.UI.createWindow({
      backgroundColor: 'red',
      title: 'Red'
  });
  win2.add(Ti.UI.createLabel({text: 'I am a red window.'}));
   
  var tab1 = Ti.UI.createTab({
      window: win1,
      title: 'Blue'
  }),
  tab2 = Ti.UI.createTab({
      window: win2,
      title: 'Red'
  }),
  tabGroup = Ti.UI.createTabGroup({
      tabs: [tab1, tab2]
  });
  tabGroup.open();
}

function Test5 () {
  var win = Ti.UI.createWindow({
      backgroundColor: '#fff'
  });
   
  var list = Ti.UI.createListView({
      top: 50,
      keepSectionsInSearch: true,
      sections: [Ti.UI.createListSection({
                  headerTitle:"Line1",
          items: [{
              properties: {
                  title: "Close Window",
                  searchableText: "Close Window",
              }
          },{
              properties: {
                  title: "Item 2",
                  searchableText: "Item 2",
              }
          },{
              properties: {
                  title: "Item 3",
                  searchableText: "Item 3",
              }
          }
          ]
      }),
      Ti.UI.createListSection({
                   headerTitle:"Line2",
   
          items: [{
              properties: {
                  title: "I4",
                  searchableText: "I4",
              }
          },{
              properties: {
                  title: "Item 5",
                  searchableText: "Item 5",
              }
          },{
              properties: {
                  title: "Item 6",
                  searchableText: "Item 6",
              }
          }
          ]
      })]
  })
   
   list.addEventListener("delete", function(e){
      Ti.API.info("Deleted Row Index is is: " +e.itemIndex);
      Ti.API.info("Deleted Section Index is is: " +e.sectionIndex);
   });
  var searchBar = Ti.UI.createSearchBar({
      top:0,
      height:44,
      barColor:'#000',
      showCancel:true,
  });
  searchBar.addEventListener('change', function(e){
  list.searchText = e.value;
  });
   
  searchBar.addEventListener('return', function(e){
    searchBar.blur();
  });
   
  searchBar.addEventListener('cancel', function(e){
    searchBar.blur();
  });
  
  list.addEventListener('itemclick', function(e) {
      Ti.API.info('click at index: ' + e.itemIndex);
    if (e.itemIndex == 0) {
      win.close();
    };
  });
  win.add(searchBar);
  win.add(list);
  win.open();
}

function Test6(){
  var rows = [];
  for (var i = 0; i < 20; i++) {
    var title = i ? 'Row '+ i : 'Close Window'
    rows.push({ properties: { title:title  , backgroundColor: 'red', searchableText:title}});
  }
  var win = Ti.UI.createWindow({
    title: 'TEST',
    backgroundColor: '#ffffff',
  }); 
   
  var view = Titanium.UI.createView({
          top:50,
          width:220,
          left:100,
  });
   
  var sb = Ti.UI.createSearchBar({
                  showCancel:true,
  });
   
  var ls = Ti.UI.createListSection({
    items: rows
  });
   var lv = Ti.UI.createListView({
      sections: [ls],
      searchView: sb,
  });
   
  sb.setHintText("test");
   sb.addEventListener('change', function(e){
    Ti.API.info(e.value);
  });
   //when the return key is hit, remove focus from our searchBar
  sb.addEventListener('return', function(e){
    sb.blur();
  });
  lv.addEventListener('itemclick', function(e) {
      Ti.API.info('click at index: ' + e.itemIndex);
      if (e.itemIndex == 0) {
      win.close();
    };
  });
   
  view.add(lv);
  win.add(view);
  win.open();
}

function Test7() {
  var win = Ti.UI.createWindow({
  title: "Listview test",
  barColor: "#cc0000",
  autoAdjustScrollViewInsets: true,
  extendEdges: [Ti.UI.EXTEND_EDGE_TOP],
  titleAttributes: {
    color: '#fff'
  },
  backgroundColor: '#fff'
});
 
var list = Ti.UI.createListView({
  sections: [Ti.UI.createListSection({
    items: [{ properties: { title: 'Close Window' } }, { properties: { title: 'Test 2' } }, { properties: { title: 'Test 3' } }, { properties: { title: 'Test 4' } }, { properties: { title: 'Test 5' } }, { properties: { title: 'Test 6' } }]
  })]
});

  list.addEventListener('itemclick', function(e) {
      Ti.API.info('click at index: ' + e.itemIndex);
      if (e.itemIndex == 0) {
      navwin.close();
    };
  });

win.add(list);
 
var navwin = Titanium.UI.iOS.createNavigationWindow({
   window: win
});
navwin.open();
}
     
function Test8() {
    var rows = [];
    for (var i = 0; i < 20; i++) {
      var title = i ? 'Row '+ i : 'Close Window'
      rows.push({ properties: { title:title  , backgroundColor: 'red', searchableText:title}});
    }
     
    var win = Ti.UI.createWindow({
      title: 'TEST',
      backgroundColor: '#ffffff',
    });
     
    var nav = Ti.UI.iOS.createNavigationWindow({ 
      window: win,
     });
     
     var testView = Ti.UI.createView({
        left : 20,
        right : 40
     });
    var sb = Ti.UI.createSearchBar();
     
    var ls = Ti.UI.createListSection({
      items: rows
    });
     
     var lv = Ti.UI.createListView({
        dimBackgroundForSearch: true,
        sections: [ls],
        searchView: sb,
    });
     
     testView.add(lv);
     
    sb.setHintText("test");
     sb.addEventListener('change', function(e){
      Ti.API.info(e.value);
    });
     
    sb.addEventListener('return', function(e){
      sb.blur();
    });
    lv.addEventListener('itemclick', function(e) {
      if (e.itemIndex == 0) {
             nav.close();
        } else {
        Ti.API.info('click at index: ' + e.itemIndex);
        var win1 = Ti.UI.createWindow({
          title: 'SecondWindow',
          backgroundColor: 'blue',
        });
        nav.openWindow(win1);
      }
    });
     
    win.add(testView);
    nav.open();
}

function Test9() {
    var win1 = Titanium.UI.createWindow({
        backgroundColor: 'white',
        title: 'Red Window',
        extendSafeArea : false
    });
     
    var win2 = Titanium.UI.createWindow({
      backgroundColor : 'blue'
    });
     
     var button = Titanium.UI.createButton({
        title: 'Close Window',
    });
    var rows = [];
    for (var i = 0; i < 5; i++) {
      var title = i ? 'Row '+ i : 'Close Window'
      rows.push({ properties: { title:title  , backgroundColor: 'red', searchableText:title}});
    }
     
    var sb = Ti.UI.createSearchBar();
    var ls = Ti.UI.createListSection({
      items: rows
    });
     
     var lv = Ti.UI.createListView({
        top : 0,
        sections: [ls],
        searchView: sb,
    });
     
    sb.addEventListener('return', function(e){
      sb.blur();
    });
    lv.addEventListener('itemclick', function(e) {
        Ti.API.info('click at index: ' + e.itemIndex);
        if (e.itemIndex == 0) {
             win1.close();
        } else {
         win2.open();
        }
    }); 
    win2.add(button);
     
    win1.add(lv);
     
    button.addEventListener('click', function(){
      win2.close();
    });
     
    win1.open();
}

function Test10() {
  var win = Ti.UI.createWindow({
      backgroundColor: '#ffffff',
  });
  var view = Titanium.UI.createView({
          top:50,
          width:220,
          left:100,
  });
  var tableData = [ {title: 'Close Window'},{title: 'Apples'}, {title: 'Bananas'}, {title: 'Carrots'}, {title: 'Potatoes'} ];
  var searchBar = Titanium.UI.createSearchBar({
              showCancel:true,
          
  });
  var table = Ti.UI.createTableView({
    data: tableData,
    search:searchBar,
    width:200
  });

  table.addEventListener('click', function(e) {
       if (e.index == 0) {
             win.close();
        }    
      });

  view.add(table);
  win.add(view);
  win.open();
}


function Test11() {
    var rows = [];
    for (var i = 0; i < 20; i++) {
         var title = i ? 'Row '+ i : 'Close Window';
        rows.push({ title: title});
    } 
    var win = Ti.UI.createWindow({
      backgroundColor: '#ffffff',
      extendSafeArea : false
    });
     
     var button = Titanium.UI.createButton({
        title: 'Close Window',
    });
     
    win.add(button);
     
    var win2 = Titanium.UI.createWindow({
      backgroundColor: 'blue'
    });
     
    var sb = Ti.UI.createSearchBar();
     
    var lv = Ti.UI.createTableView({
        hideSearchOnSelection: false,
        data: rows,
        search: sb,
    });
     sb.setHintText("test");
      
    win2.add(button);
     
    lv.addEventListener('click', function(e) {
      if (e.index == 0) {
             win.close();
        } else {
          win2.open();
        }
    })
     
     button.addEventListener('click', function(){
      win2.close();
    });
    win.add(lv);
    win.open();
}

function Test12() {
    var rows = [];
    for (var i = 0; i < 20; i++) {
        var title = i ? 'Row '+ i : 'Close Window';
        rows.push({ title: title});    
      }
     
    var win = Ti.UI.createWindow({
      backgroundColor: '#ffffff',
      layout : 'vertical'
    });
     
    var nav = Ti.UI.iOS.createNavigationWindow({ 
      window: win,
     });
     
    var sb = Ti.UI.createSearchBar();
     
    var lv = Ti.UI.createTableView({
        data: rows,
        search: sb,
        hideSearchOnSelection: false,
    });
     
     sb.setHintText("test");
     sb.addEventListener('change', function(e){
      Ti.API.info(e.value);
    });
     
    sb.addEventListener('return', function(e){
    sb.blur();
    });
     
    sb.addEventListener('cancel', function(e){
    });
    lv.addEventListener('click', function(e) {
      if (e.index == 0) {
             nav.close();
        } else {
            var win1 = Ti.UI.createWindow({
            title: 'SecondWindow',
             backgroundColor: 'blue',
          });
          nav.openWindow(win1); 
        }
    })
     
    win.add(lv);
    nav.open();
}

function Test13() {
    var rows = [];
    for (var i = 0; i < 10; i++) {
        var title = i ? 'Row '+ i : 'Close Window';
        rows.push({ title: title});
      }
     
    var win = Ti.UI.createWindow({
      backgroundColor: 'red',
      layout : 'vertical'
    });
      
    var sb = Ti.UI.createSearchBar();
    var lv = Ti.UI.createTableView({
        data: rows,
        search: sb,
        top : 50,
        left : 30
    });
     
     sb.setHintText("test");
     sb.addEventListener('change', function(e){
      Ti.API.info(e.value);
      view.setHeight(50);
    });
     
    sb.addEventListener('return', function(e){
    sb.blur();
    view.setHeight(0);
    });
     
    sb.addEventListener('cancel', function(e){
          view.setHeight(0);
    });
    lv.addEventListener('click', function(e) {
    if (e.index == 0) {
             win.close();
        }     
    })
     
     var view = Ti.UI.createView({
      backgroundColor : 'blue',
      height : 0,
    });
     view.addEventListener('click', function(e){
        Ti.API.info('view clicked');
      });
    win.add(view);
    win.add(lv);
    win.open();
}

function Test14() {
    var win = Ti.UI.createWindow({
      backgroundColor: 'white'
    });
    var view = Titanium.UI.createView({
        top:30,
        width:300,
        left:10,
    });
    var oldRow;
    var tableData = [{title: 'Close Window'}, {title: 'Change Row Height to 100'}, {title: 'Change Row Color to Blue'}, {title: 'Delete Row'}, 
    {title: 'Insert Row Before This Row'}, {title: 'Insert Row After This Row'}, {title : 'Update This Row'}, 
    {title : 'Append Row'}, {title : 'Set New Data to TableView'}];
     
    var sectionUpdate = Ti.UI.createTableViewSection({ headerTitle: 'Update Rows proeprties' });
    sectionUpdate.add(Ti.UI.createTableViewRow({ title: 'Change Row Height to 100' }));
    sectionUpdate.add(Ti.UI.createTableViewRow({ title: 'Change Row Color to Blue' }));
     
    var sectionInsert = Ti.UI.createTableViewSection({ headerTitle: 'Insert/Delete rows' });
    sectionInsert.add(Ti.UI.createTableViewRow({ title: 'Delete Row' }));
    sectionInsert.add(Ti.UI.createTableViewRow({ title: 'Insert Row Before This Row' }));
     
    var tableDataNew = [sectionUpdate, sectionInsert];
     
    var searchBar = Titanium.UI.createSearchBar({
          showCancel:true,  
    });
    var table = Ti.UI.createTableView({
      data: tableData,
      search:searchBar,
      width:200, 
      hideSearchOnSelection:false,
    });
     
    table.addEventListener('click', function(e) {
      if (e.row.title == 'Close Window') {
        win.close();
      } else if (e.row.title == 'Change Row Height to 100') {
        e.row.setHeight(100);
      } else if (e.row.title == 'Change Row Color to Blue') {
        e.row.backgroundColor = 'blue';
      } else if (e.row.title == 'Delete Row') {
        table.deleteRow(e.row);
      } else if (e.row.title == 'Insert Row Before This Row') {
        var row = Ti.UI.createTableViewRow({title : 'Row Inserted Before'});
        table.insertRowBefore(e.index, row);
      } else if (e.row.title == 'Insert Row After This Row') {
        var row = Ti.UI.createTableViewRow({title : 'Row Inserted After'});
        table.insertRowAfter(e.index, row);
      } else if (e.row.title == 'Update This Row') {
        var row = Ti.UI.createTableViewRow({title : 'Updated Row'});
        table.updateRow(e.index, row);
      } else if (e.row.title == 'Append Row') {
        var row = Ti.UI.createTableViewRow({title : 'Appended Row'});
        table.appendRow(row);
      } else if (e.row.title == 'Set New Data to TableView') {
        table.setData(tableDataNew);
      } 
    }); 
    view.add(table);
    win.add(view);
    win.open();
}

function Test15() {
      var win = Ti.UI.createWindow({
      title: "Tableview test",
      barColor: "#cc0000",
      autoAdjustScrollViewInsets: true,
      extendEdges: [Ti.UI.EXTEND_EDGE_TOP],
      titleAttributes: {
        color: '#fff'
      },
      backgroundColor: '#fff'
    });

     var data = [{title: 'Close Window'}, { title: 'Test 1' }, { title: 'Test 2' }, { title: 'Test 3' }, { title: 'Test 4' } ];

      var tableView = Ti.UI.createTableView({data : data});

    tableView.addEventListener('click', function(e) {
          if (e.index == 0) {
          navwin.close();
        };
      });

    win.add(tableView);
     
    var navwin = Titanium.UI.iOS.createNavigationWindow({
       window: win
    });
    navwin.open();
}

function Test16() {
      // TIUITableView with navigation
    var rows = [];
    for (var i = 0; i < 20; i++) {
        var title = i ? 'Row '+ i : 'Close Window';
        rows.push({ title: title});
      }
    var win = Ti.UI.createWindow({
      title: 'TEST',
      backgroundColor: '#ffffff',
      navBarHidden: false
    });
     
    var nav = Ti.UI.iOS.createNavigationWindow({ 
      window: win,
     });
     
    var sb = Ti.UI.createSearchBar();
     
    var lv = Ti.UI.createTableView({
        hideSearchOnSelection: false,
        data: rows,
        search: sb,
    });
     
     sb.setHintText("test");
     sb.addEventListener('change', function(e){
      Ti.API.info(e.value);
    });
     
     //when the return key is hit, remove focus from our searchBar
    sb.addEventListener('return', function(e){
    sb.blur();
    });
     
    //when the cancel button is tapped, remove focus from our searchBar
    sb.addEventListener('cancel', function(e){
    //sb.blur();
    });
    lv.addEventListener('click', function(e) {
        Ti.API.info('click at index: ' + e.index);
        Ti.API.info('clicked row data: ' + e.rowData.title);
        if (e.index == 0) {
          nav.close();
        }
    })
    win.add(lv);
    nav.open();
}

function Test17() {
      //Tableview with tabbar
    var rows = [];
    for (var i = 0; i < 20; i++) {
        var title = i ? 'Row '+ i : 'Close Window';
        rows.push({ title: title});
    }
     
    var win1 = Ti.UI.createWindow({
      title: 'TEST',
      backgroundColor: 'red',
      navBarHidden: false
    });
      
    var sb = Ti.UI.createSearchBar();
     
    var lv = Ti.UI.createTableView({
        hideSearchOnSelection: false,
        dimBackgroundForSearch: true,
        data: rows,
        search: sb,
    });
     
     sb.setHintText("test");
     sb.addEventListener('change', function(e){
      Ti.API.info(e.value);
    });
     
     //when the return key is hit, remove focus from our searchBar
    sb.addEventListener('return', function(e){
    sb.blur();
    });
     
    //when the cancel button is tapped, remove focus from our searchBar
    sb.addEventListener('cancel', function(e){
    //sb.blur();
    });
    lv.addEventListener('click', function(e) {
        Ti.API.info('click at index: ' + e.index);
        Ti.API.info('clicked row data: ' + e.rowData.title);
        if (e.index == 0) {
            tabGroup.close();
        }
    })
     
    win1.add(lv);
     
    var win2 = Ti.UI.createWindow({
        backgroundColor: 'red',
        title: 'Red'
    });
    win2.add(Ti.UI.createLabel({text: 'I am a red window.'}));
     
    var tab1 = Ti.UI.createTab({
        window: win1,
        title: 'Blue'
    }),
    tab2 = Ti.UI.createTab({
        window: win2,
        title: 'Red'
    }),
    tabGroup = Ti.UI.createTabGroup({
        tabs: [tab1, tab2]
    });
    tabGroup.open();
}

function Test18 () {
    var rows = [];
    for (var i = 0; i < 20; i++) {
        var title = i ? 'Row '+ i : 'Close Window';
        rows.push({ title: title});
    }
    var win = Ti.UI.createWindow({
      title: 'TEST',
      backgroundColor: '#ffffff',
      navBarHidden: false
    });
     
    var nav = Ti.UI.iOS.createNavigationWindow({ 
      window: win,
     });
     
    var sb = Ti.UI.createSearchBar();
     
    var lv = Ti.UI.createTableView({
        hideSearchOnSelection: false,
        data: rows,
        search: sb,
    });
     
     sb.setHintText("test");
     sb.addEventListener('change', function(e){
      Ti.API.info(e.value);
    });
     
     //when the return key is hit, remove focus from our searchBar
    sb.addEventListener('return', function(e){
    sb.blur();
    });
     
    //when the cancel button is tapped, remove focus from our searchBar
    sb.addEventListener('cancel', function(e){
    //sb.blur();
    });
    lv.addEventListener('click', function(e) {
        Ti.API.info('click at index: ' + e.index);
        Ti.API.info('clicked row data: ' + e.rowData.title);
        if (e.index == 0) {
          nav.close();
        } else {
          widgetView.visible = true;
          activityIndicator.show();
        }
    })
  var widgetView = Ti.UI.createView({
  backgroundColor : 'yellow',
  visible : false,
  elevation: 24,
  opacity: '20%'
  });

  var activityIndicator = Ti.UI.createActivityIndicator({
    color: 'green',
    font: {fontFamily:'Helvetica Neue', fontSize:26, fontWeight:'bold'},
    message: 'Loading...',
    style: Ti.UI.ActivityIndicatorStyle.DARK,
    top:10,
    left:10,
    height:Ti.UI.SIZE,
    width:Ti.UI.SIZE
  });

  var button = Ti.UI.createButton({
    title : 'Close',
    bottom : 30
  });

  button.addEventListener('click', function(e){
    widgetView.visible = false;
    activityIndicator.hide();
  });

  widgetView.add(activityIndicator);
  win.add(lv);
  win.add(widgetView);
  win.add(button);
  nav.open();
}
*/
/*
var win = Ti.UI.createWindow({
	backgroundColor : '#fff'
});

function getImage() {
	var url = "https://tineye.com/images/widgets/mona.jpg";
	var response = '';
	var client = Ti.Network.createHTTPClient({
		// function called when the response data is available
		onload : function(e) {
			Ti.API.info("Received Data: " + this.responseData);
			if (this.responseData) {
				response = this.responseData;
				var imageView = Ti.UI.createImageView({
					image : response,
					width : Ti.UI.SIZE,
					height : Ti.UI.SIZE
				});

				win.add(imageView);
			}
			alert('success');
		},
		// function called when an error occurs, including a timeout
		onerror : function(e) {
			Ti.API.debug(e.error);
			alert('error');
		},
		timeout : 5000 // in milliseconds
	});
	// Prepare the connection.
	client.open("GET", url);
	// Send the request.
	client.send();
}

getImage();

win.open(); 
*/

/*
var tabGroup = Ti.UI.createTabGroup();


tabGroup.addTab(createTab("Tab 1", "I am Window 1", "assets/images/tab1.png"));
tabGroup.addTab(createTab("Tab 2", "I am Window 2", "assets/images/tab2.png"));

tabGroup.open();

function createTab(title, message, icon) {
    var win = Ti.UI.createWindow({
        title: title,
        backgroundColor: '#fff'
    });

    var label = Ti.UI.createLabel({
        text: message,
        color: "#333",
        font: {
            fontSize: 20
        }
    });

    win.add(label);

    var tab = Ti.UI.createTab({
        title: title,
        icon: icon,
        window: win
    });

    return tab;
}
*/

var win = Ti.UI.createWindow({
    backgroundColor : '#fff'
});

var button = Ti.UI.createButton({
    top: 100,
    title: 'Download Image'
});

button.addEventListener('click', function(e){
  getImage();
});

win.add(button);

function getImage() {
    var url = "https://tineye.com/images/widgets/mona.jpg";
    var response = '';
    var client = Ti.Network.createHTTPClient({
        // function called when the response data is available
        onload : function(e) {
            Ti.API.info("Received Data: " + this.responseData);
            if (this.responseData) {
                response = this.responseData;
                var imageView = Ti.UI.createImageView({
                    top: 200,
                    image : response,
                    width : Ti.UI.SIZE,
                    height : Ti.UI.SIZE
                });

                win.add(imageView);
            }
            alert('success');
        },
        // function called when an error occurs, including a timeout
        onerror : function(e) {
            Ti.API.debug(e.error);
            alert('error');
        },
        timeout : 5000 // in milliseconds
    });
    // Prepare the connection.
    client.open("GET", url);
    // Send the request.
    client.send();
  }
  win.open();