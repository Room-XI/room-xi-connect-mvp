(function() {
  'use strict';
  
  var form = document.querySelector('form');
  var submitBtn = document.getElementById('submit-btn');
  var checkboxes = document.querySelectorAll('input[type="checkbox"]');
  
  if (!form || !submitBtn || checkboxes.length === 0) {
    return;
  }
  
  function updateButtonState() {
    var allChecked = true;
    for (var i = 0; i < checkboxes.length; i++) {
      if (!checkboxes[i].checked) {
        allChecked = false;
        break;
      }
    }
    submitBtn.disabled = !allChecked;
  }
  
  for (var i = 0; i < checkboxes.length; i++) {
    checkboxes[i].addEventListener('change', updateButtonState);
  }
  
  updateButtonState();
  
  form.addEventListener('submit', function() {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
  });
})();
