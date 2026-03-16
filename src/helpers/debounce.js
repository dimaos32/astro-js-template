function debounce(cb, delay) {
  let timerId;

  return function (...args) {
    clearTimeout(timerId);

    timerId = setTimeout(function () {
      cb(...args);
    }, delay);
  };
}

export { debounce };
