export function PageViews({ pageViews, categoryData }) {
    const sites = Object.keys( pageViews );
    
    if (sites.length === 0) {
      return <div className="no-data">No pageviews recorded yet</div>;
    }
  
    return (
      <div className="data-container">
        <h3>Page Views</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Website</th> 
              <th>Views</th>
            </tr>
          </thead>
          <tbody>
            {sites.map(site => (
              <tr key={site}>
                <td className={categoryData[site]??''}>{site}</td>
                <td>{pageViews[site]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
