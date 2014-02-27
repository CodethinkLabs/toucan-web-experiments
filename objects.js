$(document).ready(function () {
  // connect to the Toucan service
  var service = new consonant.Service('http://localhost:8989');

  service.ref('master', function (master) {
    // update the navigation
    updateNavigation(service, master.head);

    // create lanes in the default view
    master.head.objects(function (views) {
      $.map(views, function (view) {
        if (view.get('name') == 'Default') {
          createLanes(master.head, view);
        }
      });
    }, 'view');
  });

});



function updateNavigation(service, commit) {
  // load all views from master
  commit.objects(function (views) {
    $.map(views, function (view) {
      var entry = '<li><a href="#">' + view.get('name') + '</a></li>';
      $('#nav-list-views').parent().append(entry);
    });
  }, 'view');

  // load all reasons from master
  commit.objects(function (reasons) {
    $.map(reasons, function (reason) {
      var entry = '<li>' +
                  '<a href="#">' +
                  '<span class="badge">' + reason.get('short-name') + '</span> ' +
                  reason.get('name') +
                  '</a></li>';
      $('#nav-list-reasons').parent().append(entry);
    });
  }, 'reason');

  // load all milestones from master
  commit.objects(function (milestones) {
    $.map(milestones, function (milestone) {
      var entry = '<li>' +
                  '<a href="#">' +
                  '<span class="badge">' + milestone.get('short-name') + '</span> ' +
                  milestone.get('name') +
                  '</a></li>';
      $('#nav-list-milestones').parent().append(entry);
    });
  }, 'milestone');

  // load all lanes from master
  commit.objects(function (lanes) {
    $.map(lanes, function (lane) {
      var entry = '<li><a href="#">' + lane.get('name') + '</a></li>';
      $('#nav-list-lanes').parent().append(entry);
    });
  }, 'lane');

  // load all refs from the service
  service.refs(function (refs) {
    for (var name in refs) {
      var ref = refs[name];
      var entry = '<li><a href="#">' + ref.url_aliases[0] + '</a></li>';
      if (ref.type == 'branch') {
        $('#nav-list-branches').after(entry);
      } else {
        $('#nav-list-tags').after(entry);
      }
    }
  });
}



function createLanes(commit, view) {
  var references = view.get('lanes');
  $.map(references, function (reference) {
    commit.object(reference.uuid, function (lane) {
      createLane(lane, references.length);
      populateLane(commit, lane);
    });
  });
}



function createLane(lane, num_lanes) {
  var index = $('#lanes').children().length;
  var distance = 1.0;
  var width = (100.0 - distance * num_lanes) / num_lanes;
  var offset = 100.0 + index * (width + distance);

  // create lane
  var lane_div = $('#lanes').append('<div></div>').children().last();
  lane_div.attr('id', lane.uuid);
  lane_div.addClass('lane panel panel-default');
  lane_div.css('left', offset + '%');
  lane_div.css('width', width + '%');

  // create lane title
  var title_div = $(lane_div).append('<div></div>').children().last();
  title_div.addClass('panel-heading kanban-lane-title');
  title_div.text(lane.get('name'));
  title_div.append('<span class="badge">0</span>');

  // create cards container
  var cards_list = $(lane_div).append('<ul></ul>').children().last();
  cards_list.addClass('list-group kanban-lane-cards');
}



function populateLane(commit, lane) {
  var references = lane.get('cards');
  if (references) {
    $.map(references, function (reference) {
      commit.object(reference.uuid, function (card) {
        createCard(commit, card);
      });
    });
  }
}


function createCard(commit, card) {
  var lane_div = $('#' + card.get('lane').uuid);
  var cards_list = $(lane_div).children('ul').first();

  var item = $(cards_list).append('<li></li>').children().last();
  item.addClass('list-group-item kanban-card');

  var box = $(item).append('<div></div>').children().last();
  box.addClass('panel panel-default panel-xs');

  console.log(card);
  var title = $(box).append('<div></div>').children().last();
  title.addClass('panel-heading');
  title.text(card.uuid.substring(0, 4));

  box.append('<span class="description">' + card.get('title') + '</span>');
}
