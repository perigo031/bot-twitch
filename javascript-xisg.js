const simulateViewInjection = async (platform, channel, amount) => {
const response = await fetch('/api/view-bot', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ platform, channel, amount }),
});
return response.json();
};
