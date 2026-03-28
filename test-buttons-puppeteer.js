import puppeteer from 'puppeteer';

async function testButtons() {
    console.log('Starting Puppeteer button tests...');
    
    // Launch browser
    const browser = await puppeteer.launch({
        headless: false, // Set to true for headless mode
        devtools: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Set viewport
        await page.setViewport({ width: 1200, height: 800 });
        
        // Navigate to the application
        console.log('Navigating to http://localhost:5174...');
        await page.goto('http://localhost:5174/', { waitUntil: 'networkidle2' });
        
        // Wait for the page to load
        await page.waitForSelector('h1', { timeout: 10000 });
        
        console.log('Page loaded successfully!');
        
        // Test 1: Generate Rank-1 Matrix button
        console.log('Testing Generate Rank-1 Matrix button...');
        const generateButton = await page.$('button:contains("Generate Rank-1 Matrix")');
        if (generateButton) {
            await generateButton.click();
            console.log('Generate button clicked!');
            
            // Wait a moment for the matrix to update
            await page.waitForTimeout(1000);
            
            // Check if matrix inputs have changed from zeros
            const firstInput = await page.$('input[type="number"]');
            if (firstInput) {
                const value = await page.evaluate(el => el.value, firstInput);
                console.log('First matrix input value after generate:', value);
                
                if (parseFloat(value) !== 0) {
                    console.log('✅ Generate button test PASSED - Matrix values updated');
                } else {
                    console.log('❌ Generate button test FAILED - Matrix values not updated');
                }
            }
        } else {
            console.log('❌ Generate button not found');
        }
        
        // Test 2: Solve ODE System button
        console.log('Testing Solve ODE System button...');
        const solveButton = await page.$('button:contains("Solve ODE System")');
        if (solveButton) {
            await solveButton.click();
            console.log('Solve button clicked!');
            
            // Wait for loading state or solution
            await page.waitForTimeout(3000);
            
            // Check for solution display
            const solutionTitle = await page.$('div:contains("Solution at t =")');
            if (solutionTitle) {
                console.log('✅ Solve button test PASSED - Solution displayed');
                
                // Check for solution values
                const solutionValues = await page.$$eval('.solutionValue', els => els.map(el => el.textContent));
                console.log('Solution values:', solutionValues);
            } else {
                // Check for error message
                const errorMessage = await page.$('p:contains("Error:")');
                if (errorMessage) {
                    const errorText = await page.evaluate(el => el.textContent, errorMessage);
                    console.log('❌ Solve button test FAILED - Error occurred:', errorText);
                } else {
                    console.log('❌ Solve button test FAILED - No solution or error found');
                }
            }
        } else {
            console.log('❌ Solve button not found');
        }
        
        // Test 3: Get Step-by-Step Explanation button
        console.log('Testing Get Step-by-Step Explanation button...');
        const explanationButton = await page.$('button:contains("Get Step-by-Step Explanation")');
        if (explanationButton) {
            await explanationButton.click();
            console.log('Explanation button clicked!');
            
            // Wait for explanation
            await page.waitForTimeout(2000);
            
            // Check for explanation display
            const explanationTitle = await page.$('div:contains("Explanation")');
            if (explanationTitle) {
                console.log('✅ Explanation button test PASSED - Explanation displayed');
                
                // Check explanation content
                const explanationContent = await page.$('.explanationContent');
                if (explanationContent) {
                    const content = await page.evaluate(el => el.textContent, explanationContent);
                    console.log('Explanation content length:', content.length);
                }
            } else {
                console.log('❌ Explanation button test FAILED - No explanation found');
            }
        } else {
            console.log('❌ Explanation button not found');
        }
        
        console.log('Button tests completed!');
        
    } catch (error) {
        console.error('Error during testing:', error);
    } finally {
        await browser.close();
    }
}

// Run the test
testButtons().catch(console.error);