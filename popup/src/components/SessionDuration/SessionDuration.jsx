export function SessionDuration({ sessionData, categoryData }) {
    const formatTime = (ms) => {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    };
  
    const sites = Object.keys(sessionData);
    
    if (sites.length === 0) {
      return <div className="no-data">No session data recorded yet</div>;
    }
  
    return (
      <div className="data-container">
        <h3>Session Duration</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Website</th>
              <th>Total Duration</th>
              <th>Sessions</th>
              <th>Avg Duration</th>
            </tr>
          </thead>
          <tbody>
            {sites.map(site => {
              const data = sessionData[site];
              const avgDuration = data.sessions > 0 ? Math.floor(data.totalDuration / data.sessions) : 0;
              
              return (
                <tr key={site}>
                  <td className={categoryData[site]??''}>{site}</td>
                  <td>{formatTime(data.totalDuration)}</td>
                  <td>{data.sessions}</td>
                  <td>{formatTime(avgDuration)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
