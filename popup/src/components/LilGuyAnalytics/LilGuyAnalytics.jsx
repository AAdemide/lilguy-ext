import React, { useEffect } from "react";
import { PageViews } from "../PageViews/PageViews";
import { SessionDuration } from "../SessionDuration/SessionDuration";
import "./index.css";

export function LilGuyAnalytics() {
    const [pageViews, setPageViews] = React.useState({});
    const [sessionData, setSessionData] = React.useState({});
    const [categoryData, setCategoryData] = React.useState({});
    const [isLoading, setIsLoading] = React.useState(true);
    const [activeTab, setActiveTab] = React.useState('pageviews');

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
        chrome.storage.local.get(['pageViews', 'sessionData', 'categoryData'], (result) => {
            setPageViews(result.pageViews || {});
            setSessionData(result.sessionData || {});
            setCategoryData(result.categoryData || {});
            setIsLoading(false);
        });
    };
    const clearData = () => {
        if (confirm('Are you sure you want to clear all analytics data?')) {
            chrome.storage.local.set({ pageViews: {}, sessionData: {}, categoryData: {} });
        }
    };

    const handleStorageChange = (changes, namespace) => {
        if (namespace === 'local') {
            if (changes.pageViews) {
                setPageViews(changes.pageViews.newValue);
            }
            if (changes.sessionData) {
                setSessionData(changes.sessionData.newValue);
            }
        }
    };



    const renderData = () => {
        if (isLoading) {
            return <div className="loading">Loading data...</div>;
        }

        return activeTab === 'pageviews'
            ? <PageViews pageViews={pageViews} categoryData={categoryData}/>
            : <SessionDuration sessionData={sessionData} categoryData={categoryData}/>;
    };


    return (
        <div className="app-container">
            <h2>lilguy has been watching</h2>
            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'pageviews' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pageviews')}
                >
                    Page Views
                </button>
                <button
                    className={`tab ${activeTab === 'duration' ? 'active' : ''}`}
                    onClick={() => setActiveTab('duration')}
                >
                    Session Duration
                </button>
            </div>
            {renderData()}
            <button className="clear-data" onClick={clearData}>
                Clear Data
            </button>
        </div>
    )
}
