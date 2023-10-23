'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat,lng]
    this.distance = distance; // Km
    this.duration = duration; // in mn
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
    return this.description;
  }

  click() {
    this.clicks++;
  }
}
class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    //min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    //km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([44.4792832, 26.099712], 10, 40, 170);
// const cycling1 = new Cycling([44.4792832, 26.099712], 25, 95, 523);

/////////////////////////////////////////////////////////
// Application Architecture

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoomLevel = 15;

  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();
    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }
  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        this._error
      );
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.#map);

    // Handling Clicks on Map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach((work) => {
      this._renderWorkoutMarker(work);
    });
  }
  _error(err) {
    alert(`Couldn't load map because of an error ${err.code}: ${err.message}`);
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }
  _newWorkout(e) {
    console.log('New Workout');
    const validInputs = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every((inp) => inp > 0);
    e.preventDefault();

    //Get data from the form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers');

      workout = new Running([lat, lng], distance, duration, cadence);
    }
    // If workout cyclicng, create cyclicng object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);
    // Render workout on list
    this._renderWorkout(workout);
    // Hide form + Clear input fields
    this._hideForm();
    // Set local storage to all workout
    this._setLocalStorage();
  }
  _renderWorkoutMarker(workout) {
    const marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️ ' : '🚴🏻 '}${workout.description}`
      )
      .openPopup();

    workout.marker = marker; // set the marker property for the workout
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id=${workout.id}>
    <h2 class="workout__title">${workout.description}</h2>
    <button class="edit">Edit</button>
    <button class="delete">Delete</button>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃‍♂️' : '🚴🏻'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>
    `;
    if (workout.type === 'running')
      html += `
    <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.pace.toFixed(1)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.cadence}</span>
      <span class="workout__unit">spm</span>
    </div>
    </li>
    `;
    if (workout.type === 'cycling')
      html += `
      <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed.toFixed(1)}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevationGain}</span>
      <span class="workout__unit">m</span>
    </div>
  </li>
    `;
    form.insertAdjacentHTML('afterend', html);
    const editWorkout = form.nextElementSibling.querySelector('.edit'); // selecting the edit button in the rendered workout
    const deleteWorkout = form.nextElementSibling.querySelector('.delete'); // selecting the delete button in the rendered workout

    editWorkout.addEventListener('click', this._editWorkout.bind(this));
    deleteWorkout.addEventListener('click', this._deleteWorkout.bind(this));
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    const workout = this.#workouts.find(
      (work) => work.id === workoutEl.dataset.id
    );

    if (workout) {
      this.#map.setView(workout.coords, this.#mapZoomLevel, {
        animate: true,
        pan: {
          duration: 1
        }
      });
    }
  }

  _setLocalStorage() {
    const workoutsCopy = this.#workouts.map((workout) => {
      if (workout instanceof Running) {
        return {
          type: workout.type,
          id: workout.id,
          coords: workout.coords,
          distance: workout.distance,
          duration: workout.duration,
          cadence: workout.cadence
        };
      } else if (workout instanceof Cycling) {
        return {
          type: workout.type,
          id: workout.id,
          coords: workout.coords,
          distance: workout.distance,
          duration: workout.duration,
          elevationGain: workout.elevationGain
        };
      }
    });

    localStorage.setItem('workouts', JSON.stringify(workoutsCopy));
  }

  _getLocalStorage() {
    // 1) Get the data from local storage
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    // this.#workouts = [];
    // 2) Recreate the running and cycling objects and add the to the array
    data.forEach((work) => {
      console.log(work);
      let workout;
      if (work.type === 'running') {
        workout = new Running(
          // work.type,
          work.coords,
          work.distance,
          work.duration,
          work.cadence
        );
        workout.id = work.id;
        workout.coords = work.coords;
        this.#workouts.push(workout);
        this._renderWorkout(workout);
      } else if (work.type === 'cycling') {
        workout = new Cycling(
          // work.type,
          work.coords,
          work.distance,
          work.duration,
          work.elevationGain
        );
        workout.type = work.type;
        workout.id = work.id;
        workout.coords = work.coords;
        this.#workouts.push(workout);
        this._renderWorkout(workout);
      }
      this._setFormFields(workout, work.type);
    });
  }

  _setFormFields(workout, type) {
    console.log(type);
    inputDistance.value = workout.distance;
    inputDuration.value = workout.duration;
    inputType.value = type;

    if (type === 'running') {
      inputCadence.value = workout.cadence;
      inputElevation.value = '';
    } else if (type === 'cycling') {
      inputElevation.value = workout.elevationGain;
      inputCadence.value = '';
    }

    if (workout.type === 'running') {
      inputElevation.closest('.form__row').classList.add('form__row--hidden');
      inputCadence.closest('.form__row').classList.remove('form__row--hidden');
    } else if (workout.type === 'cycling') {
      inputCadence.closest('.form__row').classList.add('form__row--hidden');
      inputElevation
        .closest('.form__row')
        .classList.remove('form__row--hidden');
    }
  }

  _editWorkout(e) {
    console.log('Edit Workout');
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const workoutIndex = this.#workouts.findIndex(
      (work) => work.id === workoutEl.dataset.id
    );

    if (workoutIndex === -1) return;

    form.classList.remove('hidden');

    const workout = this.#workouts[workoutIndex];

    this._setFormFields(workout, workout.type);

    const handleEnterKey = (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        const newDistance = +inputDistance.value;
        const newDuration = +inputDuration.value;
        const newCadence = +inputCadence.value;
        const newElevation = +inputElevation.value;
        const newType = inputType.value;

        if (
          Number.isFinite(newDistance) &&
          Number.isFinite(newDuration) &&
          (newType === 'running' ? Number.isFinite(newCadence) : true) &&
          (newType === 'cycling' ? Number.isFinite(newElevation) : true) &&
          newDistance > 0 &&
          newDuration > 0 &&
          (newType === 'running' ? newCadence > 0 : true) &&
          (newType === 'cycling' ? newElevation > 0 : true)
        ) {
          const updatedWorkout =
            newType === 'running'
              ? new Running(
                  workout.coords,
                  newDistance,
                  newDuration,
                  newCadence
                )
              : newType === 'cycling'
              ? new Cycling(
                  workout.coords,
                  newDistance,
                  newDuration,
                  newElevation
                )
              : null;

          this.#workouts[workoutIndex] = updatedWorkout; // update the workout in the array
          this._setLocalStorage(); // update local storage
          this._hideForm(); // hide the form

          // Remove the workout from the DOM
          workoutEl.remove();

          // Render the updated workout on the screen
          this._renderWorkout(updatedWorkout);

          // Remove the old workout pin from the map
          workout.marker.remove();

          // Render the updated workout pin on the map
          this._renderWorkoutMarker(updatedWorkout);

          window.removeEventListener('keydown', handleEnterKey);
        } else {
          alert('Inputs have to be positive numbers!');
        }
      }
    };

    window.addEventListener('keydown', handleEnterKey);
  }

  _deleteWorkout(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const workoutIndex = this.#workouts.findIndex(
      (work) => work.id === workoutEl.dataset.id
    );

    if (workoutIndex === -1) return;

    // Remove the workout from the array
    const deletedWorkout = this.#workouts.splice(workoutIndex, 1)[0];

    // Update local storage
    this._setLocalStorage();

    // Remove the workout from the DOM
    workoutEl.remove();

    // Remove the workout marker from the map
    this.#map.removeLayer(deletedWorkout.marker);
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}
const app = new App();
