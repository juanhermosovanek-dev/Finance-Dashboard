// ui/goalsSection.js

import { getGoalsWithProgress } from '../models/goals.js';
import { formatMoney, formatPercent, daysBetween, todayStr } from '../util.js';
import { openAddGoalForm, openEditGoalForm, confirmAndDeleteGoal } from './goalsModal.js';

async function renderGoalsSection(root, onChanged) {
  const goals = await getGoalsWithProgress();

  root.innerHTML = `
    <div class="section-header">
      <h2>Goals</h2>
      <button id="add-goal-btn">Add Goal</button>
    </div>
    ${goals.length === 0 ? `<p class="empty-state">No goals yet. Add one to track progress toward something specific.</p>` : goals.map(goalCard).join('')}
  `;

  root.querySelector('#add-goal-btn').addEventListener('click', () => openAddGoalForm(onChanged));

  root.querySelectorAll('[data-goal-id]').forEach((el) => {
    const goal = goals.find((g) => g.id === el.dataset.goalId);
    el.querySelector('.edit-btn')?.addEventListener('click', () => openEditGoalForm(goal, onChanged));
    el.querySelector('.delete-btn')?.addEventListener('click', () => confirmAndDeleteGoal(goal, onChanged));
  });
}

function goalCard(goal) {
  const pct = formatPercent(goal.fraction);
  const daysLeft = goal.targetDate ? daysBetween(todayStr(), goal.targetDate) : null;
  const dateLabel =
    daysLeft === null ? '' : daysLeft >= 0 ? `${daysLeft} days left` : `${Math.abs(daysLeft)} days past target date`;

  return `
    <div class="goal-card" data-goal-id="${goal.id}">
      <div class="goal-card-header">
        <span class="goal-name">${goal.name}</span>
        <span class="goal-actions">
          <button class="icon-btn edit-btn">Edit</button>
          <button class="icon-btn delete delete-btn">Delete</button>
        </span>
      </div>
      <div class="goal-bar-track">
        <div class="goal-bar-fill" style="width:${Math.round(goal.fraction * 100)}%"></div>
      </div>
      <div class="goal-card-footer">
        <span>${formatMoney(Math.max(0, goal.currentAmount))} of ${formatMoney(goal.targetAmount)} (${pct})</span>
        ${dateLabel ? `<span>${dateLabel}</span>` : ''}
      </div>
    </div>
  `;
}

export { renderGoalsSection };
