// static/js/generate.js

document.addEventListener('DOMContentLoaded', () => {
    const columnContainer = document.getElementById('columnContainer');
    const addColumnBtn = document.getElementById('addColumnBtn');
    const dataForm = document.getElementById('dataForm');
    const resultContent = document.getElementById('resultContent');
    const resultDetails = document.getElementById('resultDetails');
    const fileList = document.getElementById('fileList');
    const refreshFileListBtn = document.getElementById('refreshFileListBtn');
    const menuBtn = document.getElementById('menuBtn');
    const closeMenuBtn = document.getElementById('closeMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    
    // Mobile menu functionality
    if (menuBtn && closeMenuBtn && mobileMenu) {
        menuBtn.addEventListener('click', function() {
            mobileMenu.classList.remove('hidden');
            mobileMenu.classList.add('flex');
            document.body.style.overflow = 'hidden';
        });
        
        closeMenuBtn.addEventListener('click', function() {
            mobileMenu.classList.remove('flex');
            mobileMenu.classList.add('hidden');
            document.body.style.overflow = '';
        });
        
        // Close mobile menu when clicking on a link
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', function() {
                mobileMenu.classList.remove('flex');
                mobileMenu.classList.add('hidden');
                document.body.style.overflow = '';
            });
        });
    }
    
    // Function to add a new column input row
    const addColumnRow = () => {
        const newRow = document.createElement('div');
        // Apply the same styling as the initial row, but make the remove button active
        newRow.className = 'column-entry flex flex-col md:flex-row items-stretch md:items-center space-y-2 md:space-y-0 md:space-x-2';
        newRow.innerHTML = `
            <input type="text" name="columnName[]" placeholder="e.g., email_address" class="flex-grow p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
            <select name="columnType[]" class="flex-grow p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="string">String</option>
                <option value="integer">Integer</option>
                <option value="float">Float</option>
                <option value="boolean">Boolean</option>
                <option value="date">Date</option>
            </select>
            <button type="button" class="remove-column-btn px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded md:w-10 flex items-center justify-center flex-shrink-0" title="Remove this column">
                 <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                 </svg>
            </button>
        `;
        columnContainer.appendChild(newRow);
        
        // Focus the new input field (better UX)
        setTimeout(() => {
            const inputs = newRow.querySelectorAll('input');
            if (inputs.length > 0) {
                inputs[0].focus();
            }
        }, 10);
    };

    // Event listener for the Add Column button
    addColumnBtn.addEventListener('click', addColumnRow);

    // Event listener for remove buttons using event delegation
    columnContainer.addEventListener('click', function(event) {
        // Find the closest remove button ancestor
        const removeButton = event.target.closest('.remove-column-btn');

        if (removeButton) {
            // Don't remove if it's disabled (the first row)
            if (!removeButton.disabled) {
                removeButton.closest('.column-entry').remove();
            }
        }
    });

    // Function to fetch and display the list of files
    const fetchAndDisplayFiles = () => {
        fileList.innerHTML = '<li class="text-gray-400 animate-pulse">Loading files...</li>';
        
        fetch('/list_files')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.status === 'success' && data.files && data.files.length > 0) {
                    fileList.innerHTML = ''; // Clear previous list/loading state
                    data.files.forEach(filename => {
                        const li = document.createElement('li');
                        li.className = 'flex justify-between items-center bg-gray-800 p-2 rounded hover:bg-gray-700 transition-colors';

                        const fileNameSpan = document.createElement('span');
                        fileNameSpan.textContent = filename;
                        fileNameSpan.className = 'truncate mr-2';

                        const downloadLink = document.createElement('a');
                        downloadLink.href = '#';
                        downloadLink.title = `Download ${filename}`;
                        downloadLink.dataset.filename = filename;
                        downloadLink.className = 'flex-shrink-0 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium flex items-center space-x-1 transition-colors';
                        downloadLink.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <span class="hidden sm:inline">Download</span>
                        `;
                        
                        // Add event listener for download
                        downloadLink.addEventListener('click', (e) => {
                            e.preventDefault();
                            const filename = e.currentTarget.dataset.filename;
                            
                            // First fetch the file data to get the S3 URL
                            fetch(`/download/${filename}`)
                                .then(response => response.json())
                                .then(data => {
                                    if (data.url && data.url.s3_uri) {
                                        // Redirect directly to the S3 URL
                                        window.location.href = data.url.s3_uri;
                                    } else {
                                        // Fallback to the regular download if no S3 URL is found
                                        window.location.href = `/download/${filename}`;
                                    }
                                })
                                .catch(error => {
                                    console.error('Error fetching file data:', error);
                                    // Fallback to the regular download route
                                    window.location.href = `/download/${filename}`;
                                });
                        });

                        li.appendChild(fileNameSpan);
                        li.appendChild(downloadLink);
                        fileList.appendChild(li);
                    });
                } else if (data.status === 'success') {
                    fileList.innerHTML = '<li class="text-gray-500">No generated files found.</li>';
                } else {
                    throw new Error('API did not return a successful status for listing files.');
                }
            })
            .catch(error => {
                console.error('Error fetching file list:', error);
                fileList.innerHTML = `<li class="text-red-500">Error loading file list: ${error.message}</li>`;
            });
    };
    
    // Event listener for the Refresh File List button
    refreshFileListBtn.addEventListener('click', fetchAndDisplayFiles);

    // Function to handle form submission
    dataForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        // Show the result section and set loading state
        resultDetails.open = true;
        resultContent.innerHTML = '<div class="animate-pulse flex items-center"><svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span class="text-gray-400">Generating... Please wait.</span></div>';

        try {
            // Disable submit button to prevent multiple submissions
            const submitBtn = dataForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<svg class="animate-spin h-5 w-5 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';
            
            // Get form data
            const formData = new FormData(dataForm);
            
            // Submit the form via AJAX
            const response = await fetch('/generate', {
                method: 'POST',
                body: formData
            });
            
            // Re-enable the submit button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Check if there's an S3 URL in the response
            let downloadButton = '';
            if (data.url && data.url.s3_uri) {
                downloadButton = `
                <div class="mt-4 flex justify-center">
                    <a href="${data.url.s3_uri}" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center space-x-2 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Download CSV</span>
                    </a>
                </div>`;
            }
            
            // Update the result section
            resultDetails.open = true;
            resultContent.innerHTML = `<pre class="whitespace-pre-wrap break-words">${JSON.stringify(data, null, 2)}</pre>${downloadButton}`;
            
            // Scroll to results on mobile
            if (window.innerWidth < 768) {
                resultDetails.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            
            // Refresh the file list
            fetchAndDisplayFiles();
            
        } catch (error) {
            console.error('API Error:', error);
            resultContent.innerHTML = `
                <div class="text-red-500 mb-4">Error: ${error.message}</div>
                <div class="bg-gray-800 p-3 rounded">
                    <p class="mb-2">If you're experiencing network issues:</p>
                    <ol class="list-decimal ml-6 space-y-1">
                        <li>Check your internet connection</li>
                        <li>Refresh the page and try again</li>
                        <li>Contact support if the issue persists</li>
                    </ol>
                </div>
            `;
            
            // Re-enable the submit button if it's still disabled
            const submitBtn = dataForm.querySelector('button[type="submit"]');
            if (submitBtn.disabled) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Generate Data';
            }
        }
    });

    // Initial fetch of the file list when the page loads
    fetchAndDisplayFiles();
    
    // Add responsive behavior to form elements
    const handleResponsiveLayout = () => {
        const isMobile = window.innerWidth < 768;
        
        // Handle file list section ordering
        const fileListSection = document.getElementById('fileListSection');
        if (fileListSection) {
            fileListSection.classList.toggle('order-2', isMobile);
            fileListSection.classList.toggle('order-1', !isMobile);
        }
        
        // Add labels on mobile view for column entries
        document.querySelectorAll('.column-entry').forEach(entry => {
            // Remove any existing mobile labels first
            entry.querySelectorAll('.mobile-label').forEach(label => label.remove());
            
            if (isMobile) {
                const nameInput = entry.querySelector('input[name="columnName[]"]');
                const typeSelect = entry.querySelector('select[name="columnType[]"]');
                
                if (nameInput) {
                    const nameLabel = document.createElement('label');
                    nameLabel.className = 'mobile-label text-xs text-gray-400 mb-1 block';
                    nameLabel.textContent = 'Column Name';
                    entry.insertBefore(nameLabel, nameInput);
                }
                
                if (typeSelect) {
                    const typeLabel = document.createElement('label');
                    typeLabel.className = 'mobile-label text-xs text-gray-400 mt-2 mb-1 block';
                    typeLabel.textContent = 'Data Type';
                    entry.insertBefore(typeLabel, typeSelect);
                }
            }
        });
    };
    
    // Run initially
    handleResponsiveLayout();
    
    // Listen for window resize events to update the layout
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(handleResponsiveLayout, 250);
    });
}); 