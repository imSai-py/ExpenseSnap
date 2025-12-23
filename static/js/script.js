document.addEventListener('DOMContentLoaded', function () {
    // Add animation classes to elements
    const cards = document.querySelectorAll('.glass-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.animationDelay = `${index * 0.1}s`;
        card.classList.add('animate-in');
    });

    // Handle Edit Button Click
    const editButtons = document.querySelectorAll('.edit-btn');
    editButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            const id = this.getAttribute('data-id');
            const name = this.getAttribute('data-name');
            const amount = this.getAttribute('data-amount');
            const currency = this.getAttribute('data-currency');
            const category = this.getAttribute('data-category');

            document.getElementById('edit-id').value = id;
            document.getElementById('edit-name').value = name;
            document.getElementById('edit-amount').value = amount;
            document.getElementById('edit-currency').value = currency;
            document.getElementById('edit-category').value = category;

            // Set form action
            document.getElementById('editForm').action = `/update/${id}`;

            const modal = new bootstrap.Modal(document.getElementById('editModal'));
            modal.show();
        });
    });

    // Confirmation for delete
    const deleteButtons = document.querySelectorAll('.delete-btn');
    deleteButtons.forEach(btn => {
        btn.addEventListener('click', function (e) {
            if (!confirm('Are you sure you want to delete this expense?')) {
                e.preventDefault();
            }
        });
    });

    // Initialize Chart if possible
    initChart();
});

function initChart() {
    const ctx = document.getElementById('expenseChart');
    if (!ctx) return;

    // Data passed from HTML via data attributes
    const labels = JSON.parse(ctx.getAttribute('data-labels') || '[]');
    const data = JSON.parse(ctx.getAttribute('data-values') || '[]');

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    'rgba(34, 197, 94, 0.6)',
                    'rgba(59, 130, 246, 0.6)',
                    'rgba(239, 68, 68, 0.6)',
                    'rgba(168, 85, 247, 0.6)'
                ],
                borderColor: [
                    '#22c55e',
                    '#3b82f6',
                    '#ef4444',
                    '#a855f7'
                ],
                borderWidth: 1
            }]
        },
        options: {
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#94a3b8',
                        font: {
                            family: 'Outfit'
                        },
                        padding: 20
                    }
                }
            },
            cutout: '70%',
            responsive: true,
            maintainAspectRatio: false
        }
    });
}
