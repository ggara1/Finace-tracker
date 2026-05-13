let spendingChart = null;
let accounts = JSON.parse(localStorage.getItem('accounts')) || [];
let balanceVisible = false;

function formatCurrency(amount) {
  return '$' + Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function toggleBalance() {
  balanceVisible = !balanceVisible;
  
  const balanceEl = document.getElementById('balanceAmount');
  const netEl = document.getElementById('netAmount');
  
  if (balanceVisible) {
    // Calculate and show real values
    const balance = accounts
      .filter(a => a.type !== 'Credit Card')
      .reduce((sum, a) => sum + a.balance, 0);
    
    const expenses = accounts
      .flatMap(a => a.transactions)
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    balanceEl.textContent = formatCurrency(balance);
    netEl.textContent = formatCurrency(balance - expenses);
  } else {
    balanceEl.textContent = '****';
    netEl.textContent = '****';
  }
}



function updateDashboard() {
  const allTransactions = accounts.flatMap(a =>
    a.transactions.map(t => ({ ...t, accountName: a.name, accountType: a.type }))
  );

  // Total expenses across all accounts
  const expenses = allTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // Balance = sum of all non-credit card account balances
  const balance = accounts
    .filter(a => a.type !== 'Credit Card')
    .reduce((sum, a) => sum + a.balance, 0);

// Update cards — hide balance and net by default
  document.getElementById('balanceAmount').textContent = 
    balanceVisible ? formatCurrency(balance) : '****';
  document.getElementById('expensesAmount').textContent = 
    formatCurrency(expenses);
  document.getElementById('netAmount').textContent = 
    balanceVisible ? formatCurrency(balance - expenses) : '****';


  // Recent transactions — last 5 across all accounts
  const recent = [...allTransactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  const list = document.getElementById('transactions');
  if (recent.length === 0) {
    list.innerHTML = '<p class="no-tx">No transactions yet. Add accounts to get started!</p>';
  } else {
    list.innerHTML = recent.map(t => `
      <li class="${t.type}">
        <span>${t.description}</span>
        <span class="account-source">${t.accountName}</span>
        <span class="date">${t.date}</span>
        <span>${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}</span>
      </li>
    `).join('');
  }

  updateChart(allTransactions);
}

function toggleFinn() {
  const popup = document.getElementById('finnPopup');
  popup.classList.toggle('open');
}

function showPage(pageName) {
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  document.getElementById(`page-${pageName}`).classList.add('active');
  event.currentTarget.classList.add('active');

  if (pageName === 'transactions') renderAllTransactions();
  if (pageName === 'dashboard') updateDashboard();
  if (pageName === 'accounts') renderAccounts();
}

function updateChart(allTransactions) {
  const expenses = allTransactions.filter(t => t.type === 'expense');
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

  if (spendingChart) spendingChart.destroy();
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
        legend: { labels: { color: '#ffffff' } }
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
  const inputValue = parseFloat(document.getElementById('accountBalance').value) || 0;

  if (!name) {
    alert('Please enter an account name!');
    return;
  }

  const account = {
    id: Date.now(),
    name,
    type,
    // Credit cards start at 0 spent, others start at their input value
    balance: type === 'Credit Card' ? 0 : inputValue,
    // Only credit cards have a limit
    limit: type === 'Credit Card' ? inputValue : null,
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
    updateDashboard();
  }
}

function renderAccounts() {
  const grid = document.getElementById('accountsGrid');
  if (!grid) return;

  if (accounts.length === 0) {
    grid.innerHTML = `<div class="no-accounts"><p>No accounts yet. Add your first account above!</p></div>`;
    return;
  }

  grid.innerHTML = accounts.map(account => `
    <div class="account-card" onclick="openAccount(${account.id})">
      <div class="account-card-header">
        <span class="account-icon">${getAccountIcon(account.type)}</span>
        <button class="delete-btn" onclick="event.stopPropagation(); 
          deleteAccount(${account.id})">✕</button>
      </div>
      <div class="account-name">${account.name}</div>
      <div class="account-type">${account.type}</div>
      ${account.type === 'Credit Card' ? `
        <div class="credit-spent">${formatCurrency(Math.abs(account.balance))} spent</div>
        ${account.limit ? `
          <div class="credit-bar">
            <div class="credit-bar-fill" style="width: ${Math.min((Math.abs(account.balance) / account.limit) * 100, 100)}%"></div>
          </div>
          <div class="credit-limit">of ${formatCurrency(account.limit)} limit</div>
        ` : ''}
      ` : `
        <div class="account-balance ${account.balance >= 0 ? 'positive' : 'negative'}">
          ${formatCurrency(account.balance)}
        </div>
      `}
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
    formatCurrency(account.balance);

  renderAccountTransactions(account);
  document.getElementById('accountsView').style.display = 'none';
  document.getElementById('accountDetailView').style.display = 'block';
  document.getElementById('currentAccountId').value = id;
}

function closeAccount() {
  document.getElementById('accountsView').style.display = 'block';
  document.getElementById('accountDetailView').style.display = 'none';
  updateDashboard();
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
    formatCurrency(account.balance);
  document.getElementById('accTxDescription').value = '';
  document.getElementById('accTxAmount').value = '';
  renderAccounts();
  updateDashboard();
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
    formatCurrency(account.balance);
  renderAccounts();
  updateDashboard();
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
    <span>${tx.type === 'income' ? '+' : '-'}${formatCurrency(tx.amount)}</span>
    <button class="delete-btn"
      onclick="deleteAccountTransaction(${account.id}, ${tx.id})">✕</button>
  </li>
`).join('');
}

function renderAllTransactions() {
  const list = document.getElementById('allTransactionsList');
  if (!list) return;

  const allTransactions = accounts.flatMap(a =>
    a.transactions.map(t => ({ ...t, accountName: a.name, accountId: a.id }))
  );

  allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (allTransactions.length === 0) {
    list.innerHTML = '<p class="no-tx">No transactions yet. Add accounts and start tracking!</p>';
    return;
  }

  list.innerHTML = allTransactions.map(t => `
  <li class="${t.type}">
    <span>${t.description} ${t.recurring ? '🔄' : ''}</span>
    <span class="account-source">${t.accountName}</span>
    <span class="date">${t.date}</span>
    <span class="category-tag">${t.category}</span>
    <span>${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}</span>
  </li>
`).join('');
}

async function sendToFinn() {
  const input = document.getElementById('finnInput');
  const message = input.value.trim();
  if (!message) return;

  addFinnMessage(message, 'user');
  input.value = '';
  addFinnMessage('FINN is thinking...', 'finn finn-thinking');

  const allTransactions = accounts.flatMap(a =>
    a.transactions.map(t => ({ ...t, accountName: a.name }))
  );

  const totalIncome = allTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = allTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const context = `
    User's Financial Summary:
    - Total Income: $${totalIncome.toFixed(2)}
    - Total Expenses: $${totalExpenses.toFixed(2)}
    - Current Balance: $${(totalIncome - totalExpenses).toFixed(2)}
    - Accounts: ${accounts.map(a => `${a.name} (${a.type}): $${a.balance.toFixed(2)}`).join(', ')}
    - Recent Transactions: ${JSON.stringify(allTransactions.slice(-10))}
  `;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': '${process.env.ANTHROPIC_API_KEY}',
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `You are FINN, a Financial Intelligence Neural Network.
        You are a logical, trustworthy, and personable personal financial advisor.
        You are direct, smart, and always base your advice on the user's real numbers.
        When a user wants to make a purchase, question it logically.
        You can answer questions about budgeting, saving, investing, taxes, and general finance.
        If you need more information to give accurate advice, ask the user for it.
        Always be honest even if the answer isn't what they want to hear.
        Here is the user's current financial data: ${context}`,
        messages: [{ role: 'user', content: message }]
      })
    });

    const data = await response.json();
    const messages = document.getElementById('finnMessages');
    const thinking = messages.querySelector('.finn-thinking');
    if (thinking) thinking.parentElement.remove();

    const reply = data.content[0].text;
    addFinnMessage(reply, 'finn');

  } catch (error) {
    const messages = document.getElementById('finnMessages');
    const thinking = messages.querySelector('.finn-thinking');
    if (thinking) thinking.parentElement.remove();
    addFinnMessage('Sorry, I ran into an issue. Please try again!', 'finn');
  }
}

function addFinnMessage(text, className) {
  const messages = document.getElementById('finnMessages');
  const div = document.createElement('div');
  div.className = `finn-message ${className}`;
  div.innerHTML = `<p>${text}</p>`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

// Load everything when page opens
updateDashboard();

