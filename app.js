const STORAGE_KEYS = {
  profile: 'frejfit_profile',
  statsHistory: 'frejfit_stats_history',
  plan: 'frejfit_plan',
  monthlyPhotos: 'frejfit_monthly_photos',
};

const state = {
  exercises: [],
  profile: null,
  statsHistory: [],
  plan: null,
  monthlyPhotos: {},
};

const onboardingForm = document.getElementById('onboarding-form');
const onboardingMessage = document.getElementById('onboarding-message');
const planContainer = document.getElementById('plan-container');
const progressForm = document.getElementById('progress-form');
const progressMonthInput = document.getElementById('progress-month');
const progressPhotoInput = document.getElementById('progress-photo');
const progressMessage = document.getElementById('progress-message');
const photoHistory = document.getElementById('photo-history');
const statsHistory = document.getElementById('stats-history');
const exerciseSearch = document.getElementById('exercise-search');
const exerciseLibrary = document.getElementById('exercise-library');

function loadLocalStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveLocalStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[char];
  });
}

function safeImageUrl(value) {
  const raw = String(value);
  return /^(https:\/\/|data:image\/)/.test(raw) ? raw : '';
}

function monthNow() {
  return new Date().toISOString().slice(0, 7);
}

function getBMI(weightKg, heightCm) {
  const heightM = heightCm / 100;
  return Number((weightKg / (heightM * heightM)).toFixed(1));
}

function buildPlan(profile) {
  const days = ['Day 1 - Full Body', 'Day 2 - Strength Focus', 'Day 3 - Conditioning'];
  if (!state.exercises.length) {
    return {
      createdAt: new Date().toISOString(),
      days: days.map((day) => ({ day, exercises: [] })),
    };
  }

  const selectedEquipment = new Set(profile.equipment.map((value) => value.toLowerCase()));
  selectedEquipment.add('body weight');

  const filtered = state.exercises.filter((exercise) => {
    const equipment = exercise.equipment.toLowerCase();

    if (profile.trainingLocation === 'home') {
      return equipment === 'body weight' || selectedEquipment.has(equipment);
    }

    return selectedEquipment.has(equipment) || equipment === 'body weight';
  });

  const candidates = (filtered.length >= 6 ? filtered : state.exercises).slice(0, 15);
  return {
    createdAt: new Date().toISOString(),
    days: days.map((day, dayIndex) => ({
      day,
      exercises: Array.from({ length: 3 }, (_, exerciseIndex) => {
        const exercise = candidates[(dayIndex * 3 + exerciseIndex) % candidates.length];
        const sets = profile.trainingLocation === 'home' ? 3 : 4;
        const reps = exercise.category === 'cardio' ? '30-60 sec' : '8-12 reps';

        return {
          ...exercise,
          sets,
          reps,
        };
      }),
    })),
  };
}

function renderPlan() {
  if (!state.plan) {
    planContainer.innerHTML = '<p>Complete onboarding to generate your personalized plan.</p>';
    return;
  }

  planContainer.innerHTML = `
    <p><strong>Generated:</strong> ${formatDate(state.plan.createdAt)}</p>
    ${state.plan.days
      .map(
        (day) => `
      <article class="plan-day">
        <h3>${day.day}</h3>
        ${
          day.exercises.length
            ? `<ul>
          ${day.exercises
            .map(
              (exercise) =>
                `<li>${escapeHtml(exercise.name)} — ${exercise.sets} sets × ${escapeHtml(exercise.reps)}</li>`,
            )
            .join('')}
        </ul>`
            : '<p>No matching exercises available. Update equipment and regenerate plan.</p>'
        }
      </article>
    `,
      )
      .join('')}
  `;
}

function renderStatsHistory() {
  if (!state.statsHistory.length) {
    statsHistory.innerHTML = '<p>No stats logged yet.</p>';
    return;
  }

  const rows = state.statsHistory
    .slice()
    .reverse()
    .map(
      (entry) => `
      <tr>
        <td>${formatDate(entry.createdAt)}</td>
        <td>${escapeHtml(entry.weight)}</td>
        <td>${escapeHtml(entry.height)}</td>
        <td>${escapeHtml(entry.age)}</td>
        <td>${escapeHtml(entry.bmi)}</td>
      </tr>
    `,
    )
    .join('');

  statsHistory.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Weight (kg)</th>
          <th>Height (cm)</th>
          <th>Age</th>
          <th>BMI</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderPhotoHistory() {
  const entries = Object.entries(state.monthlyPhotos).sort(([a], [b]) => b.localeCompare(a));

  if (!entries.length) {
    photoHistory.innerHTML = '<p>No monthly photos uploaded yet.</p>';
    return;
  }

  photoHistory.innerHTML = entries
    .map(
      ([month, photo]) => `
      <article class="photo-card">
        <img src="${safeImageUrl(photo.dataUrl)}" alt="Progress photo for ${escapeHtml(month)}" loading="lazy" />
        <div class="content">
          <strong>${escapeHtml(month)}</strong><br />
          <small>Uploaded ${formatDate(photo.createdAt)}</small>
        </div>
      </article>
    `,
    )
    .join('');
}

function renderExerciseLibrary() {
  const query = exerciseSearch.value.trim().toLowerCase();
  const visible = state.exercises.filter((exercise) => {
    if (!query) {
      return true;
    }

    return (
      exercise.name.toLowerCase().includes(query) ||
      exercise.target.toLowerCase().includes(query) ||
      exercise.equipment.toLowerCase().includes(query)
    );
  });

  exerciseLibrary.innerHTML = visible
    .map(
      (exercise) => `
      <article class="exercise-card">
        <img src="${safeImageUrl(exercise.gifUrl)}" alt="${escapeHtml(exercise.name)} tutorial" loading="lazy" />
        <div class="content">
          <strong>${escapeHtml(exercise.name)}</strong><br />
          <small>${escapeHtml(exercise.equipment)} • target: ${escapeHtml(exercise.target)}</small>
        </div>
      </article>
    `,
    )
    .join('');
}

function applyProfileToForm() {
  if (!state.profile) {
    return;
  }

  const locationInput = onboardingForm.querySelector(
    `input[name="trainingLocation"][value="${state.profile.trainingLocation}"]`,
  );
  if (locationInput) {
    locationInput.checked = true;
  }

  const selected = new Set(state.profile.equipment);
  onboardingForm.querySelectorAll('input[name="equipment"]').forEach((input) => {
    input.checked = selected.has(input.value);
  });

  onboardingForm.elements.weight.value = state.profile.weight;
  onboardingForm.elements.height.value = state.profile.height;
  onboardingForm.elements.age.value = state.profile.age;
}

onboardingForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const form = new FormData(onboardingForm);
  const trainingLocation = form.get('trainingLocation');
  const equipment = form.getAll('equipment');
  const weight = Number(form.get('weight'));
  const height = Number(form.get('height'));
  const age = Number(form.get('age'));

  if (
    !trainingLocation ||
    !Number.isFinite(weight) ||
    !Number.isFinite(height) ||
    !Number.isFinite(age) ||
    weight <= 0 ||
    height <= 0 ||
    age <= 0
  ) {
    onboardingMessage.textContent = 'Please fill in all required onboarding fields.';
    return;
  }

  const profile = {
    trainingLocation,
    equipment,
    weight,
    height,
    age,
    updatedAt: new Date().toISOString(),
  };

  state.profile = profile;
  saveLocalStorage(STORAGE_KEYS.profile, state.profile);

  const entry = {
    createdAt: new Date().toISOString(),
    weight,
    height,
    age,
    bmi: getBMI(weight, height),
  };
  state.statsHistory.push(entry);
  saveLocalStorage(STORAGE_KEYS.statsHistory, state.statsHistory);

  state.plan = buildPlan(profile);
  saveLocalStorage(STORAGE_KEYS.plan, state.plan);

  renderPlan();
  renderStatsHistory();

  onboardingMessage.textContent = 'Plan updated successfully.';
});

progressForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const month = progressMonthInput.value;
  const file = progressPhotoInput.files?.[0];

  if (!month || !file) {
    progressMessage.textContent = 'Select month and photo before upload.';
    return;
  }

  if (state.monthlyPhotos[month]) {
    progressMessage.textContent =
      'A photo for this month already exists. Please select a different month.';
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    state.monthlyPhotos[month] = {
      dataUrl: String(reader.result),
      createdAt: new Date().toISOString(),
      fileName: file.name,
    };

    saveLocalStorage(STORAGE_KEYS.monthlyPhotos, state.monthlyPhotos);
    renderPhotoHistory();
    progressForm.reset();
    progressMonthInput.value = monthNow();
    progressMessage.textContent = 'Monthly progress photo uploaded.';
  };

  reader.readAsDataURL(file);
});

exerciseSearch.addEventListener('input', renderExerciseLibrary);

async function init() {
  state.profile = loadLocalStorage(STORAGE_KEYS.profile, null);
  state.statsHistory = loadLocalStorage(STORAGE_KEYS.statsHistory, []);
  state.plan = loadLocalStorage(STORAGE_KEYS.plan, null);
  state.monthlyPhotos = loadLocalStorage(STORAGE_KEYS.monthlyPhotos, {});
  progressMonthInput.value = monthNow();

  try {
    const response = await fetch('data/exercises-curated.json');
    state.exercises = await response.json();
  } catch {
    state.exercises = [];
  }

  applyProfileToForm();
  renderPlan();
  renderPhotoHistory();
  renderStatsHistory();
  renderExerciseLibrary();
}

init();
