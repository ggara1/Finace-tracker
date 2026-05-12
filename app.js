let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let spendingChart = null;
let accounts = JSON.parse(localStorage.getItem('accounts')) || [];


function addTransaction() {
  const description = document.getElementById('description').value;
  const amount = parseFloat(document.getElementById('amount').value);
  const type = document.getElementById('type').value;
  const date = new Date().toLocaleDateString();

  if (!description || isNaN(amount)) {
    alert('Please fill in all fields!');
    return;
  }

  const category = document.getElementById('category').value;
  const transaction = { description, amount, type, category, date };
  transactions.push(transaction);
  saveTransactions();
  updateDashboard();
  clearForm();
}

function saveTransactions() {
  localStorage.setItem('transactions', JSON.stringify(transactions));
}

function deleteTransaction(index) {
  transactions.splice(index, 1);
  saveTransactions();
  updateDashboard();
}

function updateDashboard() {
  const income = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const expenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const balance = income - expenses;

  document.querySelector('.income p').textContent = `$${income.toFixed(2)}`;
  document.querySelector('.expenses p').textContent = `$${expenses.toFixed(2)}`;
  document.querySelector('.balance p').textContent = `$${balance.toFixed(2)}`;

  const list = document.getElementById('transactions');
  list.innerHTML = transactions.map((t, index) => `
    <li class="${t.type}">
      <span>${t.description}</span>
      <span class="date">${t.date}</span>
      <span>${t.type === 'income' ? '+' : '-'}$${t.amount.toFixed(2)}</span>
      <button class="delete-btn" onclick="deleteTransaction(${index})">✕</button>
    </li>
  `).join('');

  updateChart(); // <-- right here, inside updateDashboard, at the bottom
}

function clearForm() {
  document.getElementById('description').value = '';
  document.getElementById('amount').value = '';
}

function toggleFinn() {
  const popup = document.getElementById('finnPopup');
  popup.classList.toggle('open');
}

function showPage(pageName) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });

  // Remove active from all nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });

  // Show selected page
  document.getElementById(`page-${pageName}`).classList.add('active');

  // Highlight active nav item
  event.currentTarget.classList.add('active');
}


function updateChart() {
  const expenses = transactions.filter(t => t.type === 'expense');

  const categoryTotals = {};
  expenses.forEach(t => {
    const cat = t.category || 'Other';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount;
  });

  const labels = Object.keys(categoryTotals);
  const data = Object.values(categoryTotals);
  const colors = [
    '#4ade80', '#f87171', '#60a5fa', '#facc15',
    '#c084fc', '#fb923c', '#34d399', '#f472b6'
  ];

  if (spendingChart) {
    spendingChart.destroy();
  }

  if (labels.length === 0) return;

  const ctx = document.getElementById('spendingChart').getContext('2d');
  spendingChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.slice(0, labels.length),
        borderWidth: 0
      }]
    },
    options: {
      plugins: {
        legend: {
          labels: { color: '#ffffff' }
        }
      }
    }
  });
}

function saveAccounts() {
  localStorage.setItem('accounts', JSON.stringify(accounts));
}

function addAccount() {
  const name = document.getElementById('accountName').value.trim();
  const type = document.getElementById('accountType').value;
  const balance = parseFloat(document.getElementById('accountBalance').value) || 0;

  if (!name) {
    alert('Please enter an account name!');
    return;
  }

  const account = {
    id: Date.now(),
    name,
    type,
    balance,
    transactions: []
  };

  accounts.push(account);
  saveAccounts();
  renderAccounts();
  clearAccountForm();
}

function clearAccountForm() {
  document.getElementById('accountName').value = '';
  document.getElementById('accountBalance').value = '';
}

function deleteAccount(id) {
  if (confirm('Are you sure you want to delete this account?')) {
    accounts = accounts.filter(a => a.id !== id);
    saveAccounts();
    renderAccounts();
  }
}

function renderAccounts() {
  const grid = document.getElementById('accountsGrid');
  if (accounts.length === 0) {
    grid.innerHTML = `
      <div class="no-accounts">
        <p>No accounts yet. Add your first account above!</p>
      </div>`;
    return;
  }

  grid.innerHTML = accounts.map(account => `
    <div class="account-card" onclick="openAccount(${account.id})">
      <div class="account-card-header">
        <span class="account-icon">${getAccountIcon(account.type)}</span>
        <button class="delete-btn" onclick="event.stopPropagation(); deleteAccount(${account.id})">✕</button>
      </div>
      <div class="account-name">${account.name}</div>
      <div class="account-type">${account.type}</div>
      <div class="account-balance ${account.balance >= 0 ? 'positive' : 'negative'}">
        $${Math.abs(account.balance).toFixed(2)}
      </div>
    </div>
  `).join('');
}

function getAccountIcon(type) {
  const icons = {
    'Credit Card': '💳',
    'Debit': '🏦',
    'Savings': '🏧',
    'Investment': '📈',
    'Cash': '💵'
  };
  return icons[type] || '💰';
}

function openAccount(id) {
  const account = accounts.find(a => a.id === id);
  if (!account) return;

  document.getElementById('accountDetailName').textContent = account.name;
  document.getElementById('accountDetailType').textContent = account.type;
  document.getElementById('accountDetailBalance').textContent = 
    `$${account.balance.toFixed(2)}`;

  renderAccountTransactions(account);
  document.getElementById('accountsView').style.display = 'none';
  document.getElementById('accountDetailView').style.display = 'block';
  document.getElementById('currentAccountId').value = id;
}

function closeAccount() {
  document.getElementById('accountsView').style.display = 'block';
  document.getElementById('accountDetailView').style.display = 'none';
}

function addAccountTransaction() {
  const id = parseInt(document.getElementById('currentAccountId').value);
  const account = accounts.find(a => a.id === id);
  if (!account) return;

  const description = document.getElementById('accTxDescription').value.trim();
  const amount = parseFloat(document.getElementById('accTxAmount').value);
  const type = document.getElementById('accTxType').value;
  const category = document.getElementById('accTxCategory').value;
  const recurring = document.getElementById('accTxRecurring').checked;
  const date = new Date().toLocaleDateString();

  if (!description || isNaN(amount)) {
    alert('Please fill in all fields!');
    return;
  }

  const transaction = { id: Date.now(), description, amount, type, category, recurring, date };
  account.transactions.push(transaction);

  if (type === 'expense') {
    account.balance -= amount;
  } else {
    account.balance += amount;
  }

  saveAccounts();
  renderAccountTransactions(account);
  document.getElementById('accountDetailBalance').textContent =
    `$${account.balance.toFixed(2)}`;

  document.getElementById('accTxDescription').value = '';
  document.getElementById('accTxAmount').value = '';
}

function deleteAccountTransaction(accountId, txId) {
  const account = accounts.find(a => a.id === accountId);
  if (!account) return;

  const tx = account.transactions.find(t => t.id === txId);
  if (!tx) return;

  if (tx.type === 'expense') {
    account.balance += tx.amount;
  } else {
    account.balance -= tx.amount;
  }

  account.transactions = account.transactions.filter(t => t.id !== txId);
  saveAccounts();
  renderAccountTransactions(account);
  document.getElementById('accountDetailBalance').textContent =
    `$${account.balance.toFixed(2)}`;
}

function renderAccountTransactions(account) {
  const list = document.getElementById('accountTransactionList');
  if (account.transactions.length === 0) {
    list.innerHTML = '<p class="no-tx">No transactions yet.</p>';
    return;
  }

  list.innerHTML = account.transactions.map(tx => `
    <li class="${tx.type}">
      <span>${tx.description} ${tx.recurring ? '🔄' : ''}</span>
      <span class="date">${tx.date}</span>
      <span class="category-tag">${tx.category}</span>
      <span>${tx.type === 'income' ? '+' : '-'}$${tx.amount.toFixed(2)}</span>
      <button class="delete-btn" 
        onclick="deleteAccountTransaction(${account.id}, ${tx.id})">✕</button>
    </li>
  `).join('');
}


// Load everything when page opens
updateDashboard();

