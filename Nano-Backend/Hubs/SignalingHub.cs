using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace Nano_Backend.Hubs
{
    public class SignalingHub : Hub
    {
        //Sends an SDP offer from one client to another.
        public async Task SendOffer(string connectionId, string offer)
        {
            await Clients.Client(connectionId).SendAsync("ReceiveOffer", offer);
        }

        //Sends the SDP answer back
        public async Task SendAnswer(string connectionId, string answer)
        {
            await Clients.Client(connectionId).SendAsync("ReceiveAnswer", answer);
        }

        //Exchanges ICE candidates between peers.
        public async Task SendIceCandidate(string connectionId, string candidate)
        {
            await Clients.Client(connectionId).SendAsync("ReceiveIceCandidate", candidate);
        }
    }
}
