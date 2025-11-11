// Sidebar Toggle
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebarClose = document.getElementById('sidebar-close');
const sidebar = document.getElementById('sidebar');

if(sidebarToggle) {
  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.add('active');
  });
}

if(sidebarClose) {
  sidebarClose.addEventListener('click', () => {
    sidebar.classList.remove('active');
  });
}

// Modal Functionality
const addProductBtn = document.getElementById('add-product-btn');
const addProductModal = document.getElementById('add-product-modal');
const addPostBtn = document.getElementById('add-post-btn');
const addPostModal = document.getElementById('add-post-modal');
const closeModalButtons = document.querySelectorAll('.close-modal');

// Open Add Product Modal
if(addProductBtn && addProductModal) {
  addProductBtn.addEventListener('click', () => {
    addProductModal.classList.add('active');
  });
}

// Open Add Post Modal
if(addPostBtn && addPostModal) {
  addPostBtn.addEventListener('click', () => {
    addPostModal.classList.add('active');
  });
}

// Close Modals
closeModalButtons.forEach(button => {
  button.addEventListener('click', () => {
    const modal = button.closest('.modal');
    if(modal) {
      modal.classList.remove('active');
    }
  });
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    if(e.target === modal) {
      modal.classList.remove('active');
    }
  });
});

// Settings Tabs
const tabLinks = document.querySelectorAll('.tab-link');
const tabPanes = document.querySelectorAll('.tab-pane');

if(tabLinks.length > 0) {
  tabLinks.forEach(link => {
    link.addEventListener('click', () => {
      const tabId = link.getAttribute('data-tab');
      
      // Remove active class from all tabs and panes
      tabLinks.forEach(tab => tab.classList.remove('active'));
      tabPanes.forEach(pane => pane.classList.remove('active'));
      
      // Add active class to current tab and pane
      link.classList.add('active');
      document.getElementById(tabId).classList.add('active');
    });
  });
}

// File Upload Preview
const fileInputs = document.querySelectorAll('.file-upload input[type="file"]');

fileInputs.forEach(input => {
  input.addEventListener('change', function() {
    const uploadArea = this.nextElementSibling;
    if(this.files && this.files[0]) {
      const reader = new FileReader();
      
      reader.onload = function(e) {
        if(uploadArea.querySelector('img')) {
          uploadArea.querySelector('img').src = e.target.result;
        } else {
          const img = document.createElement('img');
          img.src = e.target.result;
          img.style.maxWidth = '100px';
          uploadArea.insertBefore(img, uploadArea.firstChild);
        }
      }
      
      reader.readAsDataURL(this.files[0]);
    }
  });
});

// Form Submission
const addProductForm = document.getElementById('add-product-form');
const addPostForm = document.getElementById('add-post-form');

if(addProductForm) {
  addProductForm.addEventListener('submit', function(e) {
    e.preventDefault();
    // Add form submission logic here
    alert('Product added successfully!');
    addProductModal.classList.remove('active');
    this.reset();
  });
}

if(addPostForm) {
  addPostForm.addEventListener('submit', function(e) {
    e.preventDefault();
    // Add form submission logic here
    alert('Blog post published successfully!');
    addPostModal.classList.remove('active');
    this.reset();
  });
}

// Delete Confirmation
const deleteButtons = document.querySelectorAll('.btn-delete');

deleteButtons.forEach(button => {
  button.addEventListener('click', function() {
    if(confirm('Are you sure you want to delete this item?')) {
      // Add delete logic here
      const card = this.closest('.product-card, .blog-post-card');
      if(card) {
        card.style.opacity = '0';
        setTimeout(() => {
          card.remove();
        }, 300);
      }
    }
  });
});

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
  console.log('Admin panel loaded successfully');
});