$(document).ready(function () {
  // connect to the Toucan service
  var service = new consonant.Service('http://localhost:8989');

  service.ref('master', function (master) {
    // fetch all objects from master
    master.head.objects(function (objects) {
      // update the navigation
      updateNavigation(master.head, objects);

      // create lanes in the default view
      $.map(objects.view, function (view) {
          if (view.get('name') == 'Default') {
            createLanes(master.head, objects, view);
          }
      });

      // update effects
      updateEffects();
    });
  });
});



function updateNavigation(commit, objects) {
  // add views to navigation
  $.map(objects.view, function (view) {
    var entry = '<li><a href="#">' + view.get('name') + '</a></li>';
    $('#nav-list-views').parent().append(entry);
  });

  // add reasons to navigation
  $.map(objects.reason, function (reason) {
    var entry = '<li>' +
                '<a href="#">' +
                '<span class="badge">' + reason.get('short-name') + '</span> ' +
                reason.get('name') +
                '</a></li>';
    $('#nav-list-reasons').parent().append(entry);
  });

  // load all milestones from master
  $.map(objects.milestone, function (milestone) {
    var entry = '<li>' +
                '<a href="#">' +
                '<span class="badge">' + milestone.get('short-name') + '</span> ' +
                milestone.get('name') +
                '</a></li>';
    $('#nav-list-milestones').parent().append(entry);
  });

  // load all lanes from master
  $.map(objects.lane, function (lane) {
    var entry = '<li><a href="#">' + lane.get('name') + '</a></li>';
    $('#nav-list-lanes').parent().append(entry);
  });

  // load all refs from the service
  commit.service.refs(function (refs) {
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



function createLanes(commit, objects, view) {
  var references = view.get('lanes');
  if (references) {
    var uuids = $.map(references, function (r) { return r.uuid; });
    $.map(uuids, function (uuid) {
      var lane = $.grep(objects.lane, function (l) { return l.uuid == uuid; })[0];
      createLane(lane, references.length);
      populateLane(commit, objects, lane);
    });
  }
}



function createLane(lane, num_lanes) {
  var index = $('#lanes').children().length;
  var distance = 1.0;
  var width = (100.0 - distance * num_lanes) / num_lanes;
  var offset = 100.0 + index * (width + distance);

  // create lane
  var lane_div = $('#lanes').append('<div></div>').children().last();
  lane_div.attr('id', lane.uuid);
  lane_div.addClass('kanban-lane');
  lane_div.css('left', offset + '%');
  lane_div.css('width', width + '%');

  var box = $(lane_div).append('<div></div>').children().last();
  box.addClass('panel panel-default');
  box.css('background-color', function () {
    var r = Math.round(200 + Math.random() * 55);
    var g = Math.round(200 + Math.random() * 55);
    var b = Math.round(200 + Math.random() * 55);
    return '#' + (r + 256 * g + 65536 * b).toString(16);
  });

  // create lane title
  var title_div = $(box).append('<div></div>').children().last();
  title_div.addClass('panel-heading kanban-lane-title');
  title_div.text(lane.get('name'));
  title_div.append('<span class="badge">0</span>');

  // create cards container
  var cards_list = $(box).append('<ul></ul>').children().last();
  cards_list.addClass('list-group kanban-lane-cards');
}



function populateLane(commit, objects, lane) {
  var references = lane.get('cards');
  if (references) {
    var uuids = $.map(references, function (r) { return r.uuid; });
    var cards = $.grep(objects.card, function (card) {
      return $.inArray(card.uuid, uuids) >= 0;
    });

    $.map(cards, function (card) {
      createCard(commit, card, lane);
    });
  }
}


function createCard(commit, card, lane) {
  var lane_div = $('#' + card.get('lane').uuid);
  var cards_list = $(lane_div).find('ul').first();

  var item = $(cards_list).append('<li></li>').children().last();
  item.addClass('list-group-item kanban-card kanban-card-doable');

  var box = $(item).append('<div></div>').children().last();
  box.addClass('panel panel-default panel-xs');

  var title = $(box).append('<div></div>').children().last();
  title.addClass('panel-heading');
  title.text(card.uuid.substring(0, 4));

  var badge = $(box).append('<div></div>').children().last();
  badge.addClass('badge');
  badge.text(lane.get('name'));

  box.append('<span class="description">' + card.get('title') + '</span>');
}
