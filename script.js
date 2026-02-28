// Data Management
class HealthcareDataManager {
    constructor() {
        this.patients = JSON.parse(localStorage.getItem('patients')) || [];
        this.visits = JSON.parse(localStorage.getItem('visits')) || [];
        this.currentModal = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateUI();
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.currentTarget));
        });

        // Form submissions
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('visitForm').addEventListener('submit', (e) => this.handleVisit(e));

        // Search and export
        document.getElementById('searchInput').addEventListener('input', (e) => this.filterRecords(e.target.value));
        document.getElementById('exportBtn').addEventListener('click', () => this.exportCSV());

        // Record type switching
        document.querySelectorAll('.record-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchRecordType(e.target));
        });

        // Set today's date as default in forms
        const today = new Date().toISOString().split('T')[0];
        const visitDateInput = document.querySelector('input[name="visitDate"]');
        if (visitDateInput) visitDateInput.value = today;
    }

    switchTab(button) {
        // Remove active state from all tabs
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active-tab');
            btn.style.color = '';
        });
        document.querySelectorAll('[id$="-tab"]').forEach(tab => tab.style.display = 'none');

        // Set active state
        button.classList.add('active-tab');
        button.style.color = '#ffffff';
        const tabName = button.getAttribute('data-tab');
        document.getElementById(`${tabName}-tab`).style.display = 'block';

        // Update patient list in visit form
        if (tabName === 'visit') {
            this.updatePatientSelect();
        }

        // Update dashboard
        if (tabName === 'dashboard') {
            this.updateDashboard();
        }

        // Update records view
        if (tabName === 'view') {
            this.renderPatients();
        }
    }

    handleRegister(e) {
        e.preventDefault();
        const formData = new FormData(document.getElementById('registerForm'));
        const patient = Object.fromEntries(formData);
        
        // Check if patient ID already exists
        if (this.patients.some(p => p.patientId === patient.patientId)) {
            this.showToast('Patient ID already exists!', 'error');
            return;
        }

        patient.registeredDate = new Date().toISOString();
        this.patients.push(patient);
        this.saveToStorage();
        this.showToast('✓ Patient registered successfully!');
        document.getElementById('registerForm').reset();
        this.updateUI();
    }

    handleVisit(e) {
        e.preventDefault();
        const formData = new FormData(document.getElementById('visitForm'));
        const visit = Object.fromEntries(formData);
        
        if (!visit.patientId) {
            this.showToast('Please select a patient!', 'error');
            return;
        }

        visit.id = Date.now().toString();
        visit.recordedDate = new Date().toISOString();
        this.visits.push(visit);
        this.saveToStorage();
        this.showToast('✓ Visit recorded successfully!');
        document.getElementById('visitForm').reset();
        const today = new Date().toISOString().split('T')[0];
        document.querySelector('input[name="visitDate"]').value = today;
        this.updatePatientSelect();
    }

    updatePatientSelect() {
        const select = document.getElementById('patientSelect');
        select.innerHTML = '<option value="">Select Patient</option>';
        this.patients.forEach(patient => {
            const option = document.createElement('option');
            option.value = patient.patientId;
            option.textContent = `${patient.fullName} (${patient.patientId})`;
            select.appendChild(option);
        });
    }

    renderPatients() {
        const tbody = document.getElementById('patientsList');
        const noData = document.getElementById('noPatients');
        
        if (this.patients.length === 0) {
            tbody.innerHTML = '';
            noData.style.display = 'block';
            return;
        }

        noData.style.display = 'none';
        tbody.innerHTML = this.patients.map(patient => `
            <tr>
                <td>${patient.patientId}</td>
                <td class="font-semibold">${patient.fullName}</td>
                <td>${this.calculateAge(patient.dob)}</td>
                <td class="hidden sm:table-cell">${patient.gender}</td>
                <td class="hidden md:table-cell"><span class="badge badge-success">${patient.bloodGroup || '-'}</span></td>
                <td class="hidden lg:table-cell">${patient.phone || '-'}</td>
                <td>
                    <button class="text-indigo-600 hover:text-indigo-800 font-semibold text-sm" onclick="manager.showPatientDetails('${patient.patientId}')">
                        <i class="fas fa-eye mr-1"></i> View
                    </button>
                </td>
            </tr>
        `).join('');
    }

    renderVisits() {
        const tbody = document.getElementById('visitsList');
        const noData = document.getElementById('noVisits');

        if (this.visits.length === 0) {
            tbody.innerHTML = '';
            noData.style.display = 'block';
            return;
        }

        noData.style.display = 'none';
        tbody.innerHTML = this.visits.map(visit => {
            const patient = this.patients.find(p => p.patientId === visit.patientId);
            return `
                <tr>
                    <td class="font-semibold">${patient?.fullName || 'Unknown'}</td>
                    <td>${new Date(visit.visitDate).toLocaleDateString()}</td>
                    <td class="hidden sm:table-cell">${visit.temperature}°C</td>
                    <td class="hidden md:table-cell">${visit.bloodPressure}</td>
                    <td class="hidden lg:table-cell truncate text-xs">${visit.chiefComplaint}</td>
                    <td>
                        <button class="text-indigo-600 hover:text-indigo-800 font-semibold text-sm" onclick="manager.showVisitDetails('${visit.id}')">
                            <i class="fas fa-eye mr-1"></i> View
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    switchRecordType(button) {
        document.querySelectorAll('.record-type-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        button.classList.add('active');

        const type = button.getAttribute('data-type');
        if (type === 'patients') {
            document.getElementById('patientsTable').style.display = 'block';
            document.getElementById('visitsTable').style.display = 'none';
            this.renderPatients();
        } else {
            document.getElementById('patientsTable').style.display = 'none';
            document.getElementById('visitsTable').style.display = 'block';
            this.renderVisits();
        }
    }

    filterRecords(searchTerm) {
        const type = document.querySelector('.record-type-btn.active').getAttribute('data-type');
        
        if (type === 'patients') {
            const filtered = this.patients.filter(p =>
                p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.patientId.toLowerCase().includes(searchTerm.toLowerCase())
            );
            this.renderFilteredPatients(filtered);
        } else {
            const filtered = this.visits.filter(v => {
                const patient = this.patients.find(p => p.patientId === v.patientId);
                return patient?.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       v.patientId.toLowerCase().includes(searchTerm.toLowerCase());
            });
            this.renderFilteredVisits(filtered);
        }
    }

    renderFilteredPatients(patients) {
        const tbody = document.getElementById('patientsList');
        const noData = document.getElementById('noPatients');

        if (patients.length === 0) {
            tbody.innerHTML = '';
            noData.style.display = 'block';
            return;
        }

        noData.style.display = 'none';
        tbody.innerHTML = patients.map(patient => `
            <tr>
                <td>${patient.patientId}</td>
                <td class="font-semibold">${patient.fullName}</td>
                <td>${this.calculateAge(patient.dob)}</td>
                <td class="hidden sm:table-cell">${patient.gender}</td>
                <td class="hidden md:table-cell"><span class="badge badge-success">${patient.bloodGroup || '-'}</span></td>
                <td class="hidden lg:table-cell">${patient.phone || '-'}</td>
                <td>
                    <button class="text-indigo-600 hover:text-indigo-800 font-semibold text-sm" onclick="manager.showPatientDetails('${patient.patientId}')">
                        <i class="fas fa-eye mr-1"></i> View
                    </button>
                </td>
            </tr>
        `).join('');
    }

    renderFilteredVisits(visits) {
        const tbody = document.getElementById('visitsList');
        const noData = document.getElementById('noVisits');

        if (visits.length === 0) {
            tbody.innerHTML = '';
            noData.style.display = 'block';
            return;
        }

        noData.style.display = 'none';
        tbody.innerHTML = visits.map(visit => {
            const patient = this.patients.find(p => p.patientId === visit.patientId);
            return `
                <tr>
                    <td class="font-semibold">${patient?.fullName || 'Unknown'}</td>
                    <td>${new Date(visit.visitDate).toLocaleDateString()}</td>
                    <td class="hidden sm:table-cell">${visit.temperature}°C</td>
                    <td class="hidden md:table-cell">${visit.bloodPressure}</td>
                    <td class="hidden lg:table-cell truncate text-xs">${visit.chiefComplaint}</td>
                    <td>
                        <button class="text-indigo-600 hover:text-indigo-800 font-semibold text-sm" onclick="manager.showVisitDetails('${visit.id}')">
                            <i class="fas fa-eye mr-1"></i> View
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    showPatientDetails(patientId) {
        const patient = this.patients.find(p => p.patientId === patientId);
        if (!patient) return;

        this.currentModal = { type: 'patient', patientId };
        const patientVisits = this.visits.filter(v => v.patientId === patientId);

        const modalContent = document.getElementById('modalContent');
        modalContent.innerHTML = `
            <div class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4">
                        <p class="text-xs uppercase font-bold text-slate-600">Full Name</p>
                        <p class="text-xl font-bold text-slate-900 mt-2">${patient.fullName}</p>
                    </div>
                    <div class="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4">
                        <p class="text-xs uppercase font-bold text-slate-600">Patient ID</p>
                        <p class="text-xl font-bold text-slate-900 mt-2">${patient.patientId}</p>
                    </div>
                    <div class="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4">
                        <p class="text-xs uppercase font-bold text-slate-600">Date of Birth</p>
                        <p class="text-lg font-semibold text-slate-900 mt-2">${new Date(patient.dob).toLocaleDateString()}</p>
                        <p class="text-sm text-slate-600">Age: ${this.calculateAge(patient.dob)} years</p>
                    </div>
                    <div class="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4">
                        <p class="text-xs uppercase font-bold text-slate-600">Gender</p>
                        <p class="text-lg font-semibold text-slate-900 mt-2">${patient.gender}</p>
                    </div>
                    <div class="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4">
                        <p class="text-xs uppercase font-bold text-slate-600">Blood Group</p>
                        <p class="text-lg font-semibold text-slate-900 mt-2"><span class="badge badge-success">${patient.bloodGroup || 'Not specified'}</span></p>
                    </div>
                    <div class="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4">
                        <p class="text-xs uppercase font-bold text-slate-600">Phone</p>
                        <p class="text-lg font-semibold text-slate-900 mt-2">${patient.phone || '-'}</p>
                    </div>
                    <div class="md:col-span-2 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4">
                        <p class="text-xs uppercase font-bold text-slate-600">Address</p>
                        <p class="text-slate-900 mt-2">${patient.address || 'Not provided'}</p>
                    </div>
                    <div class="md:col-span-2 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4">
                        <p class="text-xs uppercase font-bold text-slate-600">Medical History / Allergies</p>
                        <p class="text-slate-900 mt-2">${patient.medicalHistory || 'None recorded'}</p>
                    </div>
                </div>

                <div class="border-t border-slate-200 pt-6">
                    <h4 class="font-bold text-slate-900 mb-4 text-lg">
                        <i class="fas fa-history mr-2 text-purple-600"></i>Visit History (${patientVisits.length})
                    </h4>
                    ${patientVisits.length === 0 ? 
                        '<p class="text-slate-600">No visits recorded yet</p>' :
                        `<div class="space-y-4">
                            ${patientVisits.slice().reverse().map(visit => `
                                <div class="border border-indigo-200 rounded-lg p-4 bg-gradient-to-br from-white to-slate-50 hover:shadow-md transition">
                                    <div class="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p class="text-xs uppercase font-bold text-slate-600">Date</p>
                                            <p class="font-semibold text-slate-900">${new Date(visit.visitDate).toLocaleDateString()}</p>
                                        </div>
                                        <div>
                                            <p class="text-xs uppercase font-bold text-slate-600">Temperature</p>
                                            <p class="font-semibold text-slate-900">${visit.temperature}°C</p>
                                        </div>
                                        <div>
                                            <p class="text-xs uppercase font-bold text-slate-600">Blood Pressure</p>
                                            <p class="font-semibold text-slate-900">${visit.bloodPressure}</p>
                                        </div>
                                        <div>
                                            <p class="text-xs uppercase font-bold text-slate-600">Heart Rate</p>
                                            <p class="font-semibold text-slate-900">${visit.heartRate} bpm</p>
                                        </div>
                                        <div class="col-span-2">
                                            <p class="text-xs uppercase font-bold text-slate-600">Chief Complaint</p>
                                            <p class="font-semibold text-slate-900">${visit.chiefComplaint}</p>
                                        </div>
                                        ${visit.diagnosis ? `
                                            <div class="col-span-2">
                                                <p class="text-xs uppercase font-bold text-slate-600">Diagnosis</p>
                                                <p class="font-semibold text-slate-900">${visit.diagnosis}</p>
                                            </div>
                                        ` : ''}
                                        ${visit.treatment ? `
                                            <div class="col-span-2">
                                                <p class="text-xs uppercase font-bold text-slate-600">Treatment</p>
                                                <p class="font-semibold text-slate-900">${visit.treatment}</p>
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>`
                    }
                </div>
            </div>
        `;

        document.getElementById('modalTitle').textContent = `👤 ${patient.fullName}`;
        document.getElementById('deleteBtn').textContent = '🗑️ Delete Patient';
        document.getElementById('detailsModal').style.display = 'flex';
    }

    showVisitDetails(visitId) {
        const visit = this.visits.find(v => v.id === visitId);
        const patient = this.patients.find(p => p.patientId === visit.patientId);
        
        if (!visit) return;

        this.currentModal = { type: 'visit', visitId };

        const modalContent = document.getElementById('modalContent');
        const bmi = visit.weight && visit.height ? (visit.weight / ((visit.height / 100) ** 2)).toFixed(2) : 'N/A';

        modalContent.innerHTML = `
            <div class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4">
                        <p class="text-xs uppercase font-bold text-slate-600">Patient</p>
                        <p class="text-xl font-bold text-slate-900 mt-2">${patient?.fullName || 'Unknown'}</p>
                    </div>
                    <div class="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4">
                        <p class="text-xs uppercase font-bold text-slate-600">Patient ID</p>
                        <p class="text-xl font-bold text-slate-900 mt-2">${visit.patientId}</p>
                    </div>
                    <div class="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4">
                        <p class="text-xs uppercase font-bold text-slate-600">Visit Date</p>
                        <p class="text-xl font-bold text-slate-900 mt-2">${new Date(visit.visitDate).toLocaleDateString()}</p>
                    </div>
                    <div class="md:col-span-2 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4">
                        <p class="text-xs uppercase font-bold text-slate-600">Chief Complaint</p>
                        <p class="text-lg font-semibold text-slate-900 mt-2">${visit.chiefComplaint}</p>
                    </div>
                </div>

                <div class="border-t border-slate-200 pt-6">
                    <h4 class="font-bold text-slate-900 mb-4 text-lg">
                        <i class="fas fa-heartbeat mr-2 text-red-600"></i>Vital Signs
                    </h4>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div class="border border-indigo-200 rounded-lg p-4 bg-gradient-to-br from-white to-slate-50">
                            <p class="text-xs uppercase font-bold text-slate-600">Temperature</p>
                            <p class="text-2xl font-bold text-slate-900 mt-2">${visit.temperature}°C</p>
                        </div>
                        <div class="border border-indigo-200 rounded-lg p-4 bg-gradient-to-br from-white to-slate-50">
                            <p class="text-xs uppercase font-bold text-slate-600">Blood Pressure</p>
                            <p class="text-2xl font-bold text-slate-900 mt-2">${visit.bloodPressure}</p>
                        </div>
                        <div class="border border-indigo-200 rounded-lg p-4 bg-gradient-to-br from-white to-slate-50">
                            <p class="text-xs uppercase font-bold text-slate-600">Heart Rate</p>
                            <p class="text-2xl font-bold text-slate-900 mt-2">${visit.heartRate}</p>
                            <p class="text-xs text-slate-600">bpm</p>
                        </div>
                        <div class="border border-indigo-200 rounded-lg p-4 bg-gradient-to-br from-white to-slate-50">
                            <p class="text-xs uppercase font-bold text-slate-600">Respiratory</p>
                            <p class="text-2xl font-bold text-slate-900 mt-2">${visit.respiratoryRate}</p>
                            <p class="text-xs text-slate-600">/min</p>
                        </div>
                        ${visit.weight ? `
                            <div class="border border-indigo-200 rounded-lg p-4 bg-gradient-to-br from-white to-slate-50">
                                <p class="text-xs uppercase font-bold text-slate-600">Weight</p>
                                <p class="text-2xl font-bold text-slate-900 mt-2">${visit.weight}</p>
                                <p class="text-xs text-slate-600">kg</p>
                            </div>
                        ` : ''}
                        ${visit.height ? `
                            <div class="border border-indigo-200 rounded-lg p-4 bg-gradient-to-br from-white to-slate-50">
                                <p class="text-xs uppercase font-bold text-slate-600">Height</p>
                                <p class="text-2xl font-bold text-slate-900 mt-2">${visit.height}</p>
                                <p class="text-xs text-slate-600">cm</p>
                            </div>
                        ` : ''}
                        ${bmi !== 'N/A' ? `
                            <div class="border border-indigo-200 rounded-lg p-4 bg-gradient-to-br from-white to-slate-50">
                                <p class="text-xs uppercase font-bold text-slate-600">BMI</p>
                                <p class="text-2xl font-bold text-slate-900 mt-2">${bmi}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>

                ${visit.diagnosis ? `
                    <div class="border-t border-slate-200 pt-6">
                        <h4 class="font-bold text-slate-900 mb-3">
                            <i class="fas fa-stethoscope mr-2 text-indigo-600"></i>Diagnosis
                        </h4>
                        <div class="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4">
                            <p class="text-slate-900">${visit.diagnosis}</p>
                        </div>
                    </div>
                ` : ''}

                ${visit.treatment ? `
                    <div class="border-t border-slate-200 pt-6">
                        <h4 class="font-bold text-slate-900 mb-3">
                            <i class="fas fa-pills mr-2 text-orange-600"></i>Treatment / Prescription
                        </h4>
                        <div class="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4">
                            <p class="text-slate-900 whitespace-pre-wrap">${visit.treatment}</p>
                        </div>
                    </div>
                ` : ''}

                ${visit.notes ? `
                    <div class="border-t border-slate-200 pt-6">
                        <h4 class="font-bold text-slate-900 mb-3">
                            <i class="fas fa-sticky-note mr-2 text-yellow-600"></i>Notes
                        </h4>
                        <div class="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4">
                            <p class="text-slate-900 whitespace-pre-wrap">${visit.notes}</p>
                        </div>
                    </div>
                ` : ''}

                <div class="border-t border-slate-200 pt-6 text-xs text-slate-600 bg-slate-50 rounded-lg p-4">
                    <i class="fas fa-clock mr-2"></i>Recorded: ${new Date(visit.recordedDate).toLocaleDateString()} at ${new Date(visit.recordedDate).toLocaleTimeString()}
                </div>
            </div>
        `;

        document.getElementById('modalTitle').textContent = `🏥 Visit Record: ${patient?.fullName || 'Unknown'}`;
        document.getElementById('deleteBtn').textContent = '🗑️ Delete Visit Record';
        document.getElementById('detailsModal').style.display = 'flex';
    }

    updateDashboard() {
        const today = new Date().toDateString();
        const todayVisits = this.visits.filter(v => new Date(v.visitDate).toDateString() === today).length;
        
        document.getElementById('totalPatients').textContent = this.patients.length;
        document.getElementById('totalVisits').textContent = this.visits.length;
        document.getElementById('todayVisits').textContent = todayVisits;

        // Calculate average age
        const ages = this.patients.map(p => this.calculateAge(p.dob));
        const avgAge = ages.length > 0 ? (ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(1) : 0;
        document.getElementById('avgAge').textContent = avgAge;

        // Gender distribution
        const genderStats = {};
        this.patients.forEach(p => {
            genderStats[p.gender] = (genderStats[p.gender] || 0) + 1;
        });

        const genderDiv = document.getElementById('genderStats');
        genderDiv.innerHTML = Object.entries(genderStats).length === 0 ? 
            '<p class="text-slate-600">No data</p>' :
            Object.entries(genderStats).map(([gender, count]) => `
                <div class="flex justify-between items-center p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg hover:shadow-md transition">
                    <span class="font-semibold text-slate-700">${gender}</span>
                    <span class="bg-indigo-600 text-white px-3 py-1 rounded-full text-sm font-bold">${count}</span>
                </div>
            `).join('');

        // Blood group distribution
        const bgStats = {};
        this.patients.forEach(p => {
            if (p.bloodGroup) {
                bgStats[p.bloodGroup] = (bgStats[p.bloodGroup] || 0) + 1;
            }
        });

        const bgDiv = document.getElementById('bloodGroupStats');
        bgDiv.innerHTML = Object.entries(bgStats).length === 0 ? 
            '<p class="text-slate-600">No data</p>' :
            Object.entries(bgStats).map(([bg, count]) => `
                <div class="flex justify-between items-center p-3 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg hover:shadow-md transition">
                    <span class="font-semibold text-slate-700">
                        <i class="fas fa-droplet mr-2 text-red-600"></i>${bg}
                    </span>
                    <span class="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold">${count}</span>
                </div>
            `).join('');

        // Recent visits
        const recentDiv = document.getElementById('recentVisits');
        const recentVisits = this.visits.slice().reverse().slice(0, 5);
        
        if (recentVisits.length === 0) {
            recentDiv.innerHTML = '<p class="text-slate-600">No visits recorded yet</p>';
        } else {
            recentDiv.innerHTML = recentVisits.map(visit => {
                const patient = this.patients.find(p => p.patientId === visit.patientId);
                return `
                    <div class="flex justify-between items-start p-4 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition cursor-pointer" onclick="manager.showVisitDetails('${visit.id}')">
                        <div>
                            <p class="font-bold text-slate-900">${patient?.fullName || 'Unknown'}</p>
                            <p class="text-sm text-slate-600 mt-1">${visit.chiefComplaint}</p>
                        </div>
                        <p class="text-sm text-slate-600 whitespace-nowrap ml-4">${new Date(visit.visitDate).toLocaleDateString()}</p>
                    </div>
                `;
            }).join('');
        }
    }

    exportCSV() {
        const headers = ['Patient ID', 'Full Name', 'Age', 'Gender', 'Blood Group', 'Phone', 'Address', 'Registered Date'];
        const rows = this.patients.map(p => [
            p.patientId,
            p.fullName,
            this.calculateAge(p.dob),
            p.gender,
            p.bloodGroup || '',
            p.phone || '',
            p.address || '',
            new Date(p.registeredDate).toLocaleDateString()
        ]);

        const csv = [headers, ...rows].map(row => 
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `patients_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showToast('✓ Data exported successfully!');
    }

    calculateAge(dob) {
        const today = new Date();
        const birthDate = new Date(dob);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const messageSpan = document.getElementById('toastMessage');
        messageSpan.textContent = message;
        toast.style.display = 'flex';
        
        if (type === 'error') {
            toast.style.backgroundColor = '#fee2e2';
            toast.style.borderColor = '#fecaca';
            toast.style.color = '#991b1b';
            toast.querySelector('i').className = 'fas fa-exclamation-circle';
        } else {
            toast.style.backgroundColor = '#dcfce7';
            toast.style.borderColor = '#86efac';
            toast.style.color = '#166534';
            toast.querySelector('i').className = 'fas fa-check-circle';
        }

        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    }

    saveToStorage() {
        localStorage.setItem('patients', JSON.stringify(this.patients));
        localStorage.setItem('visits', JSON.stringify(this.visits));
    }

    updateUI() {
        this.updatePatientSelect();
        this.renderPatients();
        document.getElementById('recordCount').textContent = this.patients.length + this.visits.length;
    }
}

// Global functions for modal
function closeModal() {
    document.getElementById('detailsModal').style.display = 'none';
    manager.currentModal = null;
}

function deleteRecord() {
    if (!manager.currentModal) return;

    if (confirm('⚠️ Are you sure you want to delete this record? This action cannot be undone.')) {
        if (manager.currentModal.type === 'patient') {
            manager.patients = manager.patients.filter(p => p.patientId !== manager.currentModal.patientId);
            manager.visits = manager.visits.filter(v => v.patientId !== manager.currentModal.patientId);
            manager.showToast('✓ Patient and associated visit records deleted');
        } else if (manager.currentModal.type === 'visit') {
            manager.visits = manager.visits.filter(v => v.id !== manager.currentModal.visitId);
            manager.showToast('✓ Visit record deleted');
        }

        manager.saveToStorage();
        manager.updateUI();
        closeModal();
    }
}

// Initialize the application
const manager = new HealthcareDataManager();