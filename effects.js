function getContrastYIQ(hexcolor){
  var r = parseInt(hexcolor.substr(1,2), 16);
  var g = parseInt(hexcolor.substr(3,2), 16);
  var b = parseInt(hexcolor.substr(5,2), 16);
  var yiq = ((r*299) + (g*587) + (b*114)) / 1000;
  return (yiq >= 250) ? 'dark' : 'light';
}

function highlightMilestoneCards(ms) {
  $('.kanban-card').each(function() {
    var _ms = $(this).children('div').children('.badge').html();
    if (ms != _ms) {
      $(this).fadeTo(350, 0.2);
    }
  });
}

function unhighlightMilestoneCards(ms) {
  ms = $(this).html();
  $('.kanban-card').each(function() {
    var _ms = $(this).children('div').children('.badge').html();
    if (ms != _ms) {
      $(this).fadeTo(350, 1.0);
    }
  });
}

$.fn.getHexBackgroundColor = function() {
  var rgb = $(this).css('background-color');
  rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  function hex(x) {return ("0" + parseInt(x).toString(16)).slice(-2);}
  return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
};

$.fn.updateCardCount = function() {
  var cards = $(this).find('.kanban-card');
  $(this).find('.panel > .panel-heading > .badge').html(cards.size());
};

function updateEffects() {
  $('.kanban-lane-cards').sortable({
    connectWith: '.kanban-lane-cards',
    placeholder: 'kanban-card-placeholder',
    forcePlaceholderSize: true,
    stop: function (event, ui) {
      var card = ui.item;
      var lane = card.parentsUntil('.kanban-board', '.kanban-lane');
      var bgcolor = lane.children('.panel').getHexBackgroundColor();
      var colorClass = getContrastYIQ(bgcolor);
      card.find('.panel-heading').css({
        'background-color': bgcolor,
      }).addClass(colorClass);

      lane.updateCardCount();
    },
    out: function (event, ui) {
      ui.sender.parentsUntil('.kanban-board', '.kanban-lane').updateCardCount();
    },
  }).disableSelection();

  $('.kanban-card .badge').hover(function () {
    highlightMilestoneCards($(this).html());
  }, function () {
    unhighlightMilestoneCards($(this).html());
  });

  $('#milestones .row .badge').hover(function () {
    highlightMilestoneCards($(this).html());
  }, function () {
    unhighlightMilestoneCards($(this).html());
  });

  $('#milestones .row .badge').each(function () {
    var color = $(this).css('background-color');
    var row = $(this).parentsUntil('#milestones', '.row');
    row.find('.day-workday').css({
      'background-color': color,
    });
  });

  $('.kanban-lane').each(function () {
    // update card colors
    var bgcolor = $(this).children('.panel').getHexBackgroundColor();
    var colorClass = getContrastYIQ(bgcolor);
    $(this).find('.kanban-card .panel-heading').css({
      'background-color': bgcolor,
    }).addClass(colorClass);

    $(this).updateCardCount();
  });
}
