var enertiq = {
    lines: 12,            // The number of lines to draw
    length: 7,            // The length of each line
    width: 5,             // The line thickness
    radius: 10,           // The radius of the inner circle
    scale: 1.0,           // Scales overall size of the spinner
    corners: 1,           // Roundness (0..1)
    color: '#F9C02D',     // #rgb or #rrggbb
    opacity: 1/4,         // Opacity of the lines
    rotate: 0,            // Rotation offset
    direction: 1,         // 1: clockwise, -1: counterclockwise
    speed: 1,             // Rounds per second
    trail: 100,           // Afterglow percentage
    fps: 20,              // Frames per second when using setTimeout()
    zIndex: 2e9,          // Use a high z-index by default
    className: 'spinner', // CSS class to assign to the element
    top: '50%',           // center vertically
    left: '50%',          // center horizontally
    shadow: false,        // Whether to render a shadow
    hwaccel: false,       // Whether to use hardware acceleration
    position: 'relative'  // Element positioning
  };