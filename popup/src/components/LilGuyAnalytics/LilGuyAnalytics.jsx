import React, { useEffect } from "react";
import "./index.css";

export function LilGuyAnalytics() {
    const [siteData, setSiteData] = React.useState({});
    const [isLoading, setIsLoading] = React.useState(true);

    useEffect(() => {
        loadData();
        // set up listener for storage changes
        chrome.storage.onChanged.addListener(handleStorageChange);
        return () => {
            // clean up listener when component unmounts
            chrome.storage.onChanged.removeListener(handleStorageChange);
        };
    }, []);

    const loadData = () => {
        chrome.storage.local.get(['siteData'], (result) => {
            setSiteData(result.siteData || {});
            setIsLoading(false);
        });
    };

    const clearData = () => {
        if (confirm('Are you sure you want to clear all analytics data?')) {
            chrome.storage.local.set({ siteData: {} });
        }
    };

    const handleStorageChange = (changes, namespace) => {
        if (namespace === 'local' && changes.siteData) {
            setSiteData(changes.siteData.newValue);
        }
    };

    function formatSecondsToTime(seconds) {
        const totalMinutes = Math.ceil(seconds / 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        const parts = [];
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0 || hours === 0) parts.push(`${minutes}m`);

        return parts.join(' ');
    }

    const renderData = () => {
        if (isLoading) {
            return <div className="loading">Loading data...</div>;
        }

        const sites = Object.keys(siteData);

        if (sites.length === 0) {
            return <div className="no-data">No analytics data recorded yet</div>;
        }

        return (
            <div className="data-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Website</th>
                            <th>Visits</th>
                            <th>Sessions</th>
                            <th>Total Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sites.map(site => (
                            <tr key={site}>
                                <td>{site}</td>
                                <td>{siteData[site].visits}</td>
                                <td>{siteData[site].sessions}</td>
                                <td>{formatSecondsToTime(siteData[site].totalDuration)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="app-container">
            <h2>lilguy has been watching</h2>
            {renderData()}
            <button className="clear-data" onClick={clearData}>
                Clear Data
            </button>
        </div>
    );
}
