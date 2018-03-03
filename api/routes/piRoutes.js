const routes = [
    {
        method: "POST",
        path: "/pi/toggle-garage-door",
        handler: async (request, h) => {
            const piProvider = request.app.getNewPiProvider();
            await piProvider.activateGarageDoorOpener();
            return "";
        }
    }
];

module.exports = routes;