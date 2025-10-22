/**
 * TreinoTracker - Aplicação de Acompanhamento de Treinos
 * 
 * Funcionalidades:
 * - Gerenciamento de exercícios por dia da semana
 * - Adição de séries com repetições e cargas
 * - Persistência de dados no localStorage
 * - Gráficos de progressão
 * - Export/Import de dados
 * - Dark mode
 * - Interface responsiva
 */

class TreinoTracker {
    constructor() {
        this.currentDay = 'monday';
        this.data = null;
        this.chart = null;
        this.db = null;
        this.dbName = 'TreinoTrackerDB';
        this.dbVersion = 1;
        
        this.init();
    }

    /**
     * Inicializa a aplicação
     */
    async init() {
        await this.initDB();
        await this.loadData();
        this.setupEventListeners();
        this.loadTheme();
        this.renderCurrentDay();
        this.renderDailySummary();
        this.updateExerciseSelect();
        this.setupChart();
        this.setupAutoBackup();
    }

    /**
     * Configura todos os event listeners
     */
    setupEventListeners() {
        // Navegação por dias
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.switchDay(e.currentTarget.dataset.day);
            });
        });

        // Botões principais
        document.getElementById('addExerciseBtn').addEventListener('click', () => {
            this.showAddExerciseModal();
        });

        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });

        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetData();
        });

        document.getElementById('addSampleDataBtn').addEventListener('click', () => {
            this.addSampleData();
        });

        document.getElementById('addMultipleExercisesBtn').addEventListener('click', () => {
            this.showAddMultipleExercisesModal();
        });

        // Modal de adicionar exercício
        document.getElementById('saveExerciseBtn').addEventListener('click', () => {
            this.saveExercise();
        });

        document.getElementById('cancelExerciseBtn').addEventListener('click', () => {
            this.hideModal('addExerciseModal');
        });

        // Modal de adicionar série
        document.getElementById('saveSetBtn').addEventListener('click', () => {
            this.saveSet();
        });

        document.getElementById('cancelSetBtn').addEventListener('click', () => {
            this.hideModal('addSetModal');
        });

        // Modal de editar exercício
        document.getElementById('saveEditExerciseBtn').addEventListener('click', () => {
            this.saveEditExercise();
        });

        document.getElementById('cancelEditExerciseBtn').addEventListener('click', () => {
            this.hideModal('editExerciseModal');
        });

        // Modal de editar série
        document.getElementById('saveEditSetBtn').addEventListener('click', () => {
            this.saveEditSet();
        });

        document.getElementById('cancelEditSetBtn').addEventListener('click', () => {
            this.hideModal('editSetModal');
        });

        // Modal de adicionar série rápida
        document.getElementById('saveQuickSetBtn').addEventListener('click', () => {
            this.saveQuickSet();
        });

        document.getElementById('cancelQuickSetBtn').addEventListener('click', () => {
            this.hideModal('quickAddSetModal');
        });

        // Modal de definir template
        document.getElementById('saveTemplateBtn').addEventListener('click', () => {
            this.saveTemplate();
        });

        document.getElementById('cancelTemplateBtn').addEventListener('click', () => {
            this.hideModal('setTemplateModal');
        });

        // Modal de adicionar múltiplos exercícios
        document.getElementById('saveMultipleExercisesBtn').addEventListener('click', () => {
            this.saveMultipleExercises();
        });

        document.getElementById('cancelMultipleExercisesBtn').addEventListener('click', () => {
            this.hideModal('addMultipleExercisesModal');
        });

        // Fechar modais
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.hideModal(e.target.closest('.modal').id);
            });
        });

        // Fechar modais clicando fora
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
        });

        // Import de arquivo
        document.getElementById('importFile').addEventListener('change', (e) => {
            this.importData(e.target.files[0]);
        });

        // Select de exercício para progressão
        document.getElementById('exerciseSelect').addEventListener('change', (e) => {
            this.updateProgressChart(e.target.value);
        });

        // Enter nos inputs dos modais
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const activeModal = document.querySelector('.modal.show');
                if (activeModal) {
                    const saveBtn = activeModal.querySelector('.btn-primary');
                    if (saveBtn) {
                        saveBtn.click();
                    }
                }
            } else if (e.key === 'Escape') {
                const activeModal = document.querySelector('.modal.show');
                if (activeModal) {
                    this.hideModal(activeModal.id);
                }
            }
        });
    }

    /**
     * Inicializa o IndexedDB
     */
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Store para exercícios atuais
                if (!db.objectStoreNames.contains('exercises')) {
                    const exerciseStore = db.createObjectStore('exercises', { keyPath: 'id', autoIncrement: true });
                    exerciseStore.createIndex('day', 'day', { unique: false });
                }
                
                // Store para histórico de treinos
                if (!db.objectStoreNames.contains('workoutHistory')) {
                    const historyStore = db.createObjectStore('workoutHistory', { keyPath: 'id', autoIncrement: true });
                    historyStore.createIndex('date', 'date', { unique: false });
                    historyStore.createIndex('day', 'day', { unique: false });
                }
                
                // Store para backups
                if (!db.objectStoreNames.contains('backups')) {
                    const backupStore = db.createObjectStore('backups', { keyPath: 'id', autoIncrement: true });
                    backupStore.createIndex('date', 'date', { unique: false });
                }
            };
        });
    }

    /**
     * Carrega dados do IndexedDB (com fallback para localStorage)
     */
    async loadData() {
        try {
            if (this.db) {
                // Tenta carregar do IndexedDB
                const exercises = await this.getAllExercises();
                if (exercises.length > 0) {
                    this.data = this.organizeExercisesByDay(exercises);
                    return;
                }
            }
            
            // Fallback para localStorage
            const saved = localStorage.getItem('treinoTrackerData');
            if (saved) {
                this.data = JSON.parse(saved);
                // Migra dados para IndexedDB
                await this.migrateToIndexedDB();
                return;
            }
            
            // Estrutura inicial
            this.data = {
                monday: [],
                tuesday: [],
                wednesday: [],
                thursday: [],
                friday: [],
                saturday: []
            };
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            // Fallback para localStorage
            const saved = localStorage.getItem('treinoTrackerData');
            this.data = saved ? JSON.parse(saved) : {
                monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: []
            };
        }
    }

    /**
     * Organiza exercícios por dia
     */
    organizeExercisesByDay(exercises) {
        const organized = {
            monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: []
        };
        
        exercises.forEach(exercise => {
            if (organized[exercise.day]) {
                organized[exercise.day].push(exercise);
            }
        });
        
        return organized;
    }

    /**
     * Migra dados do localStorage para IndexedDB
     */
    async migrateToIndexedDB() {
        if (!this.db) return;
        
        try {
            const transaction = this.db.transaction(['exercises'], 'readwrite');
            const store = transaction.objectStore('exercises');
            
            for (const day of Object.keys(this.data)) {
                for (const exercise of this.data[day]) {
                    await store.add({ ...exercise, day });
                }
            }
            
            console.log('Dados migrados para IndexedDB com sucesso');
        } catch (error) {
            console.error('Erro na migração:', error);
        }
    }

    /**
     * Salva dados no IndexedDB
     */
    async saveData() {
        try {
            if (this.db) {
                // Limpa dados antigos
                const transaction = this.db.transaction(['exercises'], 'readwrite');
                const store = transaction.objectStore('exercises');
                await store.clear();
                
                // Salva novos dados
                for (const day of Object.keys(this.data)) {
                    for (const exercise of this.data[day]) {
                        await store.add({ ...exercise, day });
                    }
                }
                
                // Salva também no localStorage como backup
                localStorage.setItem('treinoTrackerData', JSON.stringify(this.data));
                
                // Salva histórico do treino atual
                await this.saveWorkoutHistory();
            } else {
                // Fallback para localStorage
                localStorage.setItem('treinoTrackerData', JSON.stringify(this.data));
            }
        } catch (error) {
            console.error('Erro ao salvar dados:', error);
            // Fallback para localStorage
            localStorage.setItem('treinoTrackerData', JSON.stringify(this.data));
        }
    }

    /**
     * Obtém todos os exercícios do IndexedDB
     */
    async getAllExercises() {
        if (!this.db) return [];
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['exercises'], 'readonly');
            const store = transaction.objectStore('exercises');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Salva histórico do treino atual
     */
    async saveWorkoutHistory() {
        if (!this.db) return;
        
        try {
            const today = new Date().toISOString().split('T')[0];
            const workoutData = {
                date: today,
                day: this.currentDay,
                exercises: this.data[this.currentDay],
                timestamp: new Date().toISOString()
            };
            
            const transaction = this.db.transaction(['workoutHistory'], 'readwrite');
            const store = transaction.objectStore('workoutHistory');
            await store.add(workoutData);
        } catch (error) {
            console.error('Erro ao salvar histórico:', error);
        }
    }

    /**
     * Carrega tema do localStorage
     */
    loadTheme() {
        const savedTheme = localStorage.getItem('treinoTrackerTheme') || 'light';
        this.setTheme(savedTheme);
    }

    /**
     * Define o tema da aplicação
     */
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const themeIcon = document.querySelector('#themeToggle i');
        themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        localStorage.setItem('treinoTrackerTheme', theme);
    }

    /**
     * Alterna entre tema claro e escuro
     */
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    /**
     * Muda o dia atual
     */
    switchDay(day) {
        this.currentDay = day;
        
        // Atualiza navegação
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-day="${day}"]`).classList.add('active');
        
        // Atualiza título
        const dayNames = {
            monday: 'Segunda-feira',
            tuesday: 'Terça-feira',
            wednesday: 'Quarta-feira',
            thursday: 'Quinta-feira',
            friday: 'Sexta-feira',
            saturday: 'Sábado'
        };
        document.getElementById('currentDayTitle').textContent = dayNames[day];
        
        this.renderCurrentDay();
        this.renderDailySummary();
    }

    /**
     * Renderiza o dia atual
     */
    renderCurrentDay() {
        const container = document.getElementById('exercisesContainer');
        const exercises = this.data[this.currentDay];
        
        if (exercises.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-dumbbell"></i>
                    <h3>Nenhum exercício adicionado</h3>
                    <p>Clique em "Adicionar Exercício" para começar seu treino!</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = exercises.map((exercise, index) => `
            <div class="exercise-card">
                <div class="exercise-header">
                    <h3 class="exercise-title">
                        ${exercise.name}
                        ${exercise.template ? `<span class="exercise-template-badge"><i class="fas fa-template"></i>${this.formatReps(exercise.template)}</span>` : ''}
                        ${this.getProgressIndicator(exercise)}
                    </h3>
                    <div class="exercise-controls">
                        ${exercise.template ? `
                            <button class="btn btn-sm btn-success" onclick="app.quickAddSet(${index})">
                                <i class="fas fa-bolt"></i>
                                Série Rápida
                            </button>
                        ` : ''}
                        <button class="btn btn-sm btn-primary" onclick="app.addSet(${index})">
                            <i class="fas fa-plus"></i>
                            Adicionar Série
                        </button>
                        ${!exercise.template ? `
                            <button class="btn btn-sm btn-secondary" onclick="app.setTemplate(${index})">
                                <i class="fas fa-template"></i>
                                Definir Modelo
                            </button>
                        ` : `
                            <button class="btn btn-sm btn-secondary" onclick="app.editTemplate(${index})">
                                <i class="fas fa-edit"></i>
                                Editar Modelo
                            </button>
                        `}
                        <button class="btn btn-sm btn-secondary" onclick="app.editExercise(${index})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="app.deleteExercise(${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="exercise-body">
                    <div class="sets-container">
                        <div class="sets-header">
                            <h4 class="sets-title">Séries</h4>
                            <span class="sets-count">${exercise.sets.length} série(s)</span>
                        </div>
                        ${exercise.sets.length > 0 ? `
                            <div class="sets-list">
                                ${exercise.sets.map((set, setIndex) => `
                                    <div class="set-item">
                                        <div class="set-info">
                                            <span class="set-reps">${this.formatReps(set.reps)}</span>
                                            <span class="set-weight">${set.weight}kg</span>
                                            <span class="set-date">${this.formatDate(set.date)}</span>
                                        </div>
                                        <div class="set-controls">
                                            <button class="btn btn-sm btn-secondary" onclick="app.editSet(${index}, ${setIndex})">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="btn btn-sm btn-danger" onclick="app.deleteSet(${index}, ${setIndex})">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <div class="empty-state">
                                <i class="fas fa-list"></i>
                                <p>Nenhuma série adicionada ainda</p>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Mostra modal de adicionar exercício
     */
    showAddExerciseModal() {
        document.getElementById('exerciseName').value = '';
        this.showModal('addExerciseModal');
        document.getElementById('exerciseName').focus();
    }

    /**
     * Mostra modal de adicionar múltiplos exercícios
     */
    showAddMultipleExercisesModal() {
        document.getElementById('multipleExercises').value = '';
        document.getElementById('addTemplates').checked = true;
        this.showModal('addMultipleExercisesModal');
        document.getElementById('multipleExercises').focus();
    }

    /**
     * Salva novo exercício
     */
    saveExercise() {
        const name = document.getElementById('exerciseName').value.trim();
        
        if (!name) {
            alert('Por favor, insira o nome do exercício.');
            return;
        }
        
        const exercise = {
            name: name,
            template: null, // Modelo de repetições para o exercício
            sets: []
        };
        
        this.data[this.currentDay].push(exercise);
        this.saveData();
        this.renderCurrentDay();
        this.renderDailySummary();
        this.updateExerciseSelect();
        this.hideModal('addExerciseModal');
    }

    /**
     * Salva múltiplos exercícios
     */
    saveMultipleExercises() {
        const exercisesText = document.getElementById('multipleExercises').value.trim();
        const addTemplates = document.getElementById('addTemplates').checked;
        
        if (!exercisesText) {
            alert('Por favor, insira pelo menos um exercício.');
            return;
        }
        
        // Processa a lista de exercícios
        const exerciseNames = exercisesText
            .split('\n')
            .map(name => name.trim())
            .filter(name => name.length > 0);
        
        if (exerciseNames.length === 0) {
            alert('Nenhum exercício válido encontrado.');
            return;
        }
        
        // Cria os exercícios
        const exercises = exerciseNames.map(name => {
            const exercise = {
                name: name,
                template: null,
                sets: []
            };
            
            // Adiciona template padrão se solicitado
            if (addTemplates) {
                exercise.template = this.getDefaultTemplate(name);
            }
            
            return exercise;
        });
        
        // Adiciona todos os exercícios
        this.data[this.currentDay].push(...exercises);
        this.saveData();
        this.renderCurrentDay();
        this.renderDailySummary();
        this.updateExerciseSelect();
        this.hideModal('addMultipleExercisesModal');
        
        // Mostra confirmação
        const templateCount = exercises.filter(ex => ex.template).length;
        let message = `${exerciseNames.length} exercício(s) adicionado(s) com sucesso!`;
        if (addTemplates && templateCount > 0) {
            message += `\n${templateCount} exercício(s) receberam modelos padrão.`;
        }
        alert(message);
    }

    /**
     * Obtém template padrão para um exercício baseado no nome
     */
    getDefaultTemplate(exerciseName) {
        const name = exerciseName.toLowerCase();
        
        // Exercícios de força (baixas repetições)
        if (name.includes('supino') || name.includes('agachamento') || name.includes('levantamento') || 
            name.includes('desenvolvimento') || name.includes('remada')) {
            return '8-12';
        }
        
        // Exercícios de isolamento (médias repetições)
        if (name.includes('rosca') || name.includes('tríceps') || name.includes('ombro') || 
            name.includes('panturrilha') || name.includes('abdomen')) {
            return '12-15';
        }
        
        // Exercícios de resistência (altas repetições)
        if (name.includes('cardio') || name.includes('corrida') || name.includes('bike')) {
            return '15-20';
        }
        
        // Exercícios de força máxima
        if (name.includes('peso morto') || name.includes('agachamento livre')) {
            return '5-8';
        }
        
        // Padrão para exercícios não reconhecidos
        return '10-12';
    }

    /**
     * Adiciona série a um exercício
     */
    addSet(exerciseIndex) {
        this.currentExerciseIndex = exerciseIndex;
        document.getElementById('reps').value = '';
        document.getElementById('weight').value = '';
        
        // Define a data atual como padrão
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('setDate').value = today;
        
        this.showModal('addSetModal');
        document.getElementById('reps').focus();
    }

    /**
     * Salva nova série
     */
    saveSet() {
        const repsInput = document.getElementById('reps').value.trim();
        const weight = parseFloat(document.getElementById('weight').value);
        const dateInput = document.getElementById('setDate').value;
        
        if (!repsInput || !weight || !dateInput) {
            alert('Por favor, preencha todos os campos.');
            return;
        }
        
        // Valida e processa as repetições (número único ou faixa)
        const reps = this.parseReps(repsInput);
        if (!reps) {
            alert('Formato de repetições inválido. Use um número (ex: 12) ou uma faixa (ex: 10-15).');
            return;
        }
        
        // Valida a data
        const selectedDate = new Date(dateInput);
        if (isNaN(selectedDate.getTime())) {
            alert('Data inválida. Por favor, selecione uma data válida.');
            return;
        }
        
        const set = {
            reps: reps,
            weight: weight,
            date: selectedDate.toISOString()
        };
        
        this.data[this.currentDay][this.currentExerciseIndex].sets.push(set);
        this.saveData();
        this.renderCurrentDay();
        this.renderDailySummary();
        this.updateExerciseSelect();
        this.hideModal('addSetModal');
    }

    /**
     * Edita exercício
     */
    editExercise(exerciseIndex) {
        this.currentExerciseIndex = exerciseIndex;
        const exercise = this.data[this.currentDay][exerciseIndex];
        document.getElementById('editExerciseName').value = exercise.name;
        this.showModal('editExerciseModal');
        document.getElementById('editExerciseName').focus();
    }

    /**
     * Salva edição do exercício
     */
    saveEditExercise() {
        const name = document.getElementById('editExerciseName').value.trim();
        
        if (!name) {
            alert('Por favor, insira o nome do exercício.');
            return;
        }
        
        this.data[this.currentDay][this.currentExerciseIndex].name = name;
        this.saveData();
        this.renderCurrentDay();
        this.renderDailySummary();
        this.updateExerciseSelect();
        this.hideModal('editExerciseModal');
    }

    /**
     * Deleta exercício
     */
    deleteExercise(exerciseIndex) {
        if (confirm('Tem certeza que deseja deletar este exercício? Todas as séries serão perdidas.')) {
            this.data[this.currentDay].splice(exerciseIndex, 1);
            this.saveData();
            this.renderCurrentDay();
            this.updateExerciseSelect();
        }
    }

    /**
     * Edita série
     */
    editSet(exerciseIndex, setIndex) {
        this.currentExerciseIndex = exerciseIndex;
        this.currentSetIndex = setIndex;
        
        const set = this.data[this.currentDay][exerciseIndex].sets[setIndex];
        
        // Preenche os campos com os valores atuais
        document.getElementById('editReps').value = set.reps;
        document.getElementById('editWeight').value = set.weight;
        
        // Converte a data ISO para formato YYYY-MM-DD do input date
        const date = new Date(set.date);
        const formattedDate = date.toISOString().split('T')[0];
        document.getElementById('editDate').value = formattedDate;
        
        this.showModal('editSetModal');
        document.getElementById('editReps').focus();
    }

    /**
     * Salva edição da série
     */
    saveEditSet() {
        const repsInput = document.getElementById('editReps').value.trim();
        const weight = parseFloat(document.getElementById('editWeight').value);
        const dateInput = document.getElementById('editDate').value;
        
        if (!repsInput || !weight || !dateInput) {
            alert('Por favor, preencha todos os campos.');
            return;
        }
        
        // Valida e processa as repetições (número único ou faixa)
        const reps = this.parseReps(repsInput);
        if (!reps) {
            alert('Formato de repetições inválido. Use um número (ex: 12) ou uma faixa (ex: 10-15).');
            return;
        }
        
        // Valida a data
        const selectedDate = new Date(dateInput);
        if (isNaN(selectedDate.getTime())) {
            alert('Data inválida. Por favor, selecione uma data válida.');
            return;
        }
        
        // Atualiza a série
        this.data[this.currentDay][this.currentExerciseIndex].sets[this.currentSetIndex].reps = reps;
        this.data[this.currentDay][this.currentExerciseIndex].sets[this.currentSetIndex].weight = weight;
        this.data[this.currentDay][this.currentExerciseIndex].sets[this.currentSetIndex].date = selectedDate.toISOString();
        
        this.saveData();
        this.renderCurrentDay();
        this.renderDailySummary();
        this.updateExerciseSelect();
        this.hideModal('editSetModal');
    }

    /**
     * Define template para um exercício
     */
    setTemplate(exerciseIndex) {
        this.currentExerciseIndex = exerciseIndex;
        document.getElementById('setTemplateReps').value = '';
        this.showModal('setTemplateModal');
        document.getElementById('setTemplateReps').focus();
    }

    /**
     * Edita template de um exercício
     */
    editTemplate(exerciseIndex) {
        this.currentExerciseIndex = exerciseIndex;
        const exercise = this.data[this.currentDay][exerciseIndex];
        
        // Converte o template para string para exibição
        let templateValue = '';
        if (exercise.template) {
            if (typeof exercise.template === 'number') {
                templateValue = exercise.template.toString();
            } else if (typeof exercise.template === 'string') {
                templateValue = exercise.template;
            }
        }
        
        document.getElementById('setTemplateReps').value = templateValue;
        this.showModal('setTemplateModal');
        document.getElementById('setTemplateReps').focus();
    }

    /**
     * Salva template do exercício
     */
    saveTemplate() {
        const templateInput = document.getElementById('setTemplateReps').value.trim();
        
        if (!templateInput) {
            alert('Por favor, insira as repetições do modelo.');
            return;
        }
        
        // Valida e processa as repetições (número único ou faixa)
        const template = this.parseReps(templateInput);
        if (!template) {
            alert('Formato de repetições inválido. Use um número (ex: 12) ou uma faixa (ex: 10-15).');
            return;
        }
        
        this.data[this.currentDay][this.currentExerciseIndex].template = template;
        this.saveData();
        this.renderCurrentDay();
        this.hideModal('setTemplateModal');
    }

    /**
     * Adiciona série rápida usando o template
     */
    quickAddSet(exerciseIndex) {
        this.currentExerciseIndex = exerciseIndex;
        const exercise = this.data[this.currentDay][exerciseIndex];
        
        // Mostra o template no modal
        document.getElementById('quickTemplateReps').textContent = this.formatReps(exercise.template);
        
        // Limpa e define valores padrão
        document.getElementById('quickWeight').value = '';
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('quickDate').value = today;
        
        this.showModal('quickAddSetModal');
        document.getElementById('quickWeight').focus();
    }

    /**
     * Salva série rápida
     */
    saveQuickSet() {
        const weight = parseFloat(document.getElementById('quickWeight').value);
        const dateInput = document.getElementById('quickDate').value;
        
        if (!weight || !dateInput) {
            alert('Por favor, preencha todos os campos.');
            return;
        }
        
        // Valida a data
        const selectedDate = new Date(dateInput);
        if (isNaN(selectedDate.getTime())) {
            alert('Data inválida. Por favor, selecione uma data válida.');
            return;
        }
        
        const exercise = this.data[this.currentDay][this.currentExerciseIndex];
        const set = {
            reps: exercise.template,
            weight: weight,
            date: selectedDate.toISOString()
        };
        
        this.data[this.currentDay][this.currentExerciseIndex].sets.push(set);
        this.saveData();
        this.renderCurrentDay();
        this.renderDailySummary();
        this.updateExerciseSelect();
        this.hideModal('quickAddSetModal');
    }

    /**
     * Deleta série
     */
    deleteSet(exerciseIndex, setIndex) {
        if (confirm('Tem certeza que deseja deletar esta série?')) {
            this.data[this.currentDay][exerciseIndex].sets.splice(setIndex, 1);
            this.saveData();
            this.renderCurrentDay();
            this.updateExerciseSelect();
        }
    }

    /**
     * Mostra modal
     */
    showModal(modalId) {
        document.getElementById(modalId).classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Esconde modal
     */
    hideModal(modalId) {
        document.getElementById(modalId).classList.remove('show');
        document.body.style.overflow = '';
    }

    /**
     * Atualiza select de exercícios para progressão
     */
    updateExerciseSelect() {
        const select = document.getElementById('exerciseSelect');
        const allExercises = new Set();
        
        // Coleta todos os exercícios de todos os dias
        Object.values(this.data).forEach(dayExercises => {
            dayExercises.forEach(exercise => {
                allExercises.add(exercise.name);
            });
        });
        
        const currentValue = select.value;
        select.innerHTML = '<option value="">Selecione um exercício</option>';
        
        Array.from(allExercises).sort().forEach(exerciseName => {
            const option = document.createElement('option');
            option.value = exerciseName;
            option.textContent = exerciseName;
            select.appendChild(option);
        });
        
        // Restaura valor selecionado se ainda existir
        if (allExercises.has(currentValue)) {
            select.value = currentValue;
        }
        
        // Atualiza gráfico se houver seleção
        if (select.value) {
            this.updateProgressChart(select.value);
        }
    }

    /**
     * Configura o gráfico de progressão
     */
    setupChart() {
        const ctx = document.getElementById('progressCanvas').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Carga (kg)',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                }
            }
        });
    }

    /**
     * Atualiza gráfico de progressão
     */
    updateProgressChart(exerciseName) {
        if (!this.chart) return;
        
        const progressData = this.getExerciseProgress(exerciseName);
        
        this.chart.data.labels = progressData.labels;
        this.chart.data.datasets[0].data = progressData.weights;
        this.chart.update();
    }

    /**
     * Obtém dados de progressão de um exercício
     */
    getExerciseProgress(exerciseName) {
        const allSets = [];
        
        // Coleta todas as séries do exercício de todos os dias
        Object.values(this.data).forEach(dayExercises => {
            dayExercises.forEach(exercise => {
                if (exercise.name === exerciseName) {
                    exercise.sets.forEach(set => {
                        allSets.push({
                            weight: set.weight,
                            date: new Date(set.date)
                        });
                    });
                }
            });
        });
        
        // Ordena por data
        allSets.sort((a, b) => a.date - b.date);
        
        // Agrupa por data e pega o maior peso do dia
        const dailyMax = {};
        allSets.forEach(set => {
            const dateKey = set.date.toDateString();
            if (!dailyMax[dateKey] || set.weight > dailyMax[dateKey].weight) {
                dailyMax[dateKey] = set;
            }
        });
        
        const labels = [];
        const weights = [];
        
        Object.values(dailyMax).forEach(set => {
            labels.push(this.formatDate(set.date.toISOString()));
            weights.push(set.weight);
        });
        
        return { labels, weights };
    }

    /**
     * Processa e valida o input de repetições
     * Aceita números únicos (ex: 12) ou faixas (ex: 10-15)
     */
    parseReps(repsInput) {
        // Remove espaços extras
        const cleanInput = repsInput.replace(/\s+/g, '');
        
        // Verifica se é um número único
        const singleNumber = parseInt(cleanInput);
        if (!isNaN(singleNumber) && singleNumber > 0) {
            return singleNumber;
        }
        
        // Verifica se é uma faixa (formato: número-número)
        const rangeMatch = cleanInput.match(/^(\d+)-(\d+)$/);
        if (rangeMatch) {
            const min = parseInt(rangeMatch[1]);
            const max = parseInt(rangeMatch[2]);
            
            if (min > 0 && max > 0 && min <= max) {
                return `${min}-${max}`;
            }
        }
        
        return null; // Formato inválido
    }

    /**
     * Formata repetições para exibição
     */
    formatReps(reps) {
        if (typeof reps === 'number') {
            return `${reps}x`;
        } else if (typeof reps === 'string' && reps.includes('-')) {
            return `${reps}x`;
        }
        return `${reps}x`;
    }

    /**
     * Formata data para exibição
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    /**
     * Obtém indicador de progresso para um exercício
     */
    getProgressIndicator(exercise) {
        if (exercise.sets.length < 2) return '';
        
        const latestSet = exercise.sets[exercise.sets.length - 1];
        const previousSet = exercise.sets[exercise.sets.length - 2];
        
        if (!latestSet || !previousSet) return '';
        
        const weightDiff = latestSet.weight - previousSet.weight;
        
        if (weightDiff > 0) {
            return `<span class="progress-indicator positive">↑ +${weightDiff}kg</span>`;
        } else if (weightDiff < 0) {
            return `<span class="progress-indicator negative">↓ ${weightDiff}kg</span>`;
        } else {
            return `<span class="progress-indicator neutral">= ${latestSet.weight}kg</span>`;
        }
    }

    /**
     * Calcula resumo diário
     */
    getDailySummary() {
        const exercises = this.data[this.currentDay];
        const totalExercises = exercises.length;
        const totalSets = exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
        const totalWeight = exercises.reduce((sum, exercise) => {
            return sum + exercise.sets.reduce((setSum, set) => setSum + (set.weight * (typeof set.reps === 'number' ? set.reps : 10)), 0);
        }, 0);
        
        return {
            exercises: totalExercises,
            sets: totalSets,
            totalWeight: Math.round(totalWeight)
        };
    }

    /**
     * Renderiza resumo diário
     */
    renderDailySummary() {
        const summary = this.getDailySummary();
        const summaryElement = document.getElementById('dailySummary');
        
        if (summaryElement) {
            summaryElement.innerHTML = `
                <div class="summary-stats">
                    <div class="stat-item">
                        <span class="stat-number">${summary.exercises}</span>
                        <span class="stat-label">Exercícios</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${summary.sets}</span>
                        <span class="stat-label">Séries</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${summary.totalWeight.toLocaleString()}</span>
                        <span class="stat-label">kg Total</span>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Exporta dados para JSON
     */
    exportData() {
        const dataStr = JSON.stringify(this.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `treino-tracker-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }

    /**
     * Importa dados de JSON
     */
    importData(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                // Valida estrutura básica
                if (this.validateDataStructure(importedData)) {
                    if (confirm('Importar dados? Isso substituirá todos os dados atuais.')) {
                        this.data = importedData;
                        this.saveData();
                        this.renderCurrentDay();
                        this.updateExerciseSelect();
                        alert('Dados importados com sucesso!');
                    }
                } else {
                    alert('Arquivo inválido. Verifique se é um arquivo de backup do TreinoTracker.');
                }
            } catch (error) {
                alert('Erro ao importar arquivo. Verifique se é um arquivo JSON válido.');
            }
        };
        reader.readAsText(file);
    }

    /**
     * Valida estrutura dos dados importados
     */
    validateDataStructure(data) {
        const requiredDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        
        if (typeof data !== 'object' || data === null) return false;
        
        for (const day of requiredDays) {
            if (!Array.isArray(data[day])) return false;
            
            for (const exercise of data[day]) {
                if (!exercise.name || !Array.isArray(exercise.sets)) return false;
                
                // Valida template se existir
                if (exercise.template !== null && exercise.template !== undefined) {
                    const templateValid = (typeof exercise.template === 'number' && exercise.template > 0) || 
                                        (typeof exercise.template === 'string' && exercise.template.match(/^\d+-\d+$/));
                    if (!templateValid) return false;
                }
                
                for (const set of exercise.sets) {
                    // Aceita tanto números quanto strings para reps (faixas)
                    const repsValid = (typeof set.reps === 'number' && set.reps > 0) || 
                                    (typeof set.reps === 'string' && set.reps.match(/^\d+-\d+$/));
                    
                    if (!repsValid || typeof set.weight !== 'number' || !set.date) {
                        return false;
                    }
                }
            }
        }
        
        return true;
    }

    /**
     * Adiciona dados de teste para demonstrar progressão
     */
    addSampleData() {
        if (confirm('Adicionar dados de teste? Isso criará exercícios com séries de datas passadas para demonstrar a progressão.')) {
            const today = new Date();
            
            // Cria exercícios de exemplo com progressão e templates
            const sampleExercises = [
                {
                    name: 'Supino reto',
                    template: '8-12',
                    sets: [
                        { reps: '8-12', weight: 30, date: new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString() }, // 2 semanas atrás
                        { reps: '8-12', weight: 32.5, date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString() }, // 10 dias atrás
                        { reps: '8-12', weight: 35, date: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString() }, // 1 semana atrás
                        { reps: '8-12', weight: 37.5, date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString() } // 3 dias atrás
                    ]
                },
                {
                    name: 'Agachamento livre',
                    template: 12,
                    sets: [
                        { reps: 12, weight: 40, date: new Date(today.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString() },
                        { reps: 12, weight: 42.5, date: new Date(today.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString() },
                        { reps: 12, weight: 45, date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString() }
                    ]
                },
                {
                    name: 'Desenvolvimento',
                    template: '10-15',
                    sets: [
                        { reps: '10-15', weight: 20, date: new Date(today.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString() },
                        { reps: '10-15', weight: 22.5, date: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString() },
                        { reps: '10-15', weight: 25, date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString() }
                    ]
                }
            ];
            
            // Adiciona os exercícios à segunda-feira
            this.data.monday = [...this.data.monday, ...sampleExercises];
            
            this.saveData();
            this.renderCurrentDay();
            this.updateExerciseSelect();
            
            // Atualiza o gráfico se houver um exercício selecionado
            const selectedExercise = document.getElementById('exerciseSelect').value;
            if (selectedExercise) {
                this.updateProgressChart(selectedExercise);
            }
            
            alert('Dados de teste adicionados com sucesso! Vá para a seção "Progressão" e selecione um exercício para ver os gráficos.');
        }
    }

    /**
     * Configura backup automático
     */
    setupAutoBackup() {
        // Backup automático semanal
        const lastBackup = localStorage.getItem('lastAutoBackup');
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        if (!lastBackup || new Date(lastBackup) < oneWeekAgo) {
            this.performAutoBackup();
        }
    }

    /**
     * Executa backup automático
     */
    async performAutoBackup() {
        try {
            const backupData = {
                date: new Date().toISOString(),
                data: this.data,
                version: this.dbVersion
            };
            
            if (this.db) {
                const transaction = this.db.transaction(['backups'], 'readwrite');
                const store = transaction.objectStore('backups');
                await store.add(backupData);
                
                // Mantém apenas os últimos 10 backups
                const allBackups = await this.getAllBackups();
                if (allBackups.length > 10) {
                    const toDelete = allBackups.slice(0, allBackups.length - 10);
                    for (const backup of toDelete) {
                        await store.delete(backup.id);
                    }
                }
            }
            
            // Backup no localStorage também
            const backups = JSON.parse(localStorage.getItem('autoBackups') || '[]');
            backups.push(backupData);
            localStorage.setItem('autoBackups', JSON.stringify(backups.slice(-10)));
            localStorage.setItem('lastAutoBackup', new Date().toISOString());
            
            console.log('Backup automático realizado com sucesso');
        } catch (error) {
            console.error('Erro no backup automático:', error);
        }
    }

    /**
     * Obtém todos os backups
     */
    async getAllBackups() {
        if (!this.db) return [];
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['backups'], 'readonly');
            const store = transaction.objectStore('backups');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Restaura backup
     */
    async restoreBackup(backupId) {
        if (!this.db) return;
        
        try {
            const transaction = this.db.transaction(['backups'], 'readonly');
            const store = transaction.objectStore('backups');
            const request = store.get(backupId);
            
            request.onsuccess = () => {
                const backup = request.result;
                if (backup && confirm(`Restaurar backup de ${new Date(backup.date).toLocaleDateString('pt-BR')}?`)) {
                    this.data = backup.data;
                    this.saveData();
                    this.renderCurrentDay();
                    this.updateExerciseSelect();
                    alert('Backup restaurado com sucesso!');
                }
            };
        } catch (error) {
            console.error('Erro ao restaurar backup:', error);
        }
    }

    /**
     * Reseta todos os dados
     */
    resetData() {
        if (confirm('Tem certeza que deseja resetar todos os dados? Esta ação não pode ser desfeita.')) {
            this.data = {
                monday: [],
                tuesday: [],
                wednesday: [],
                thursday: [],
                friday: [],
                saturday: []
            };
            this.saveData();
            this.renderCurrentDay();
            this.updateExerciseSelect();
            if (this.chart) {
                this.chart.data.labels = [];
                this.chart.data.datasets[0].data = [];
                this.chart.update();
            }
            alert('Dados resetados com sucesso!');
        }
    }
}

// Inicializa a aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TreinoTracker();
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then(() => console.log('Service Worker registrado'))
    .catch(error => console.log('Falha ao registrar Service Worker:', error));
}
