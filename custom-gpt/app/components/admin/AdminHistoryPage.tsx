import React from 'react';
import { FiMoon, FiSun, FiUser } from 'react-icons/fi';
import { IoChevronDown, IoFilterOutline, IoPeopleOutline, IoSearchOutline, IoTimeOutline } from 'react-icons/io5';

const AdminHistoryPage = () => {
  return (
    <div className={`flex flex-col h-full ${false ? 'dark' : ''} bg-white dark:bg-black text-gray-900 dark:text-gray-100 overflow-hidden`}>
      <div className="px-6 pt-6 pb-5 flex-shrink-0 border-b border-gray-300 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Activity History</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track actions and changes across your workspace</p>
        </div>
        <button
            onClick={() => false}
          className={`p-2 rounded-full transition-colors self-center sm:self-auto mt-3 sm:mt-0 ${
            false 
              ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          aria-label={false ? "Switch to Light Mode" : "Switch to Dark Mode"}
          title={false ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {false ? <FiSun size={20} /> : <FiMoon size={20} />}
        </button>
      </div>

      <div className="px-6 py-4 flex-shrink-0 border-b border-gray-300 dark:border-gray-800">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="inline-flex items-center p-1 rounded-lg bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 self-center sm:self-start">
            <button
              onClick={() => false}
              className={`flex items-center px-3 py-1.5 rounded text-sm transition-all`}
            >
              <FiUser size={16} className="mr-1.5" />
              <span>Personal</span>
            </button>
            <button
              onClick={() => false}
              className={`flex items-center px-3 py-1.5 rounded text-sm transition-all`}
            >
              <IoPeopleOutline size={16} className="mr-1.5" />
              <span>Team</span>
            </button>
          </div>

          <div className="flex flex-1 sm:justify-end max-w-lg gap-2 self-center w-full sm:w-auto">
            <div className="relative flex-1 sm:max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <IoSearchOutline className="text-gray-400 dark:text-gray-500" size={18} />
              </div>
              <input
                type="text"
                className="w-full pl-10 pr-3 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 text-sm placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                placeholder="Search activities..."
                value={''}
                onChange={(e) => false}
              />
            </div>

            <div className="relative">
              <button
                onClick={() => false}
                className="flex items-center px-3 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
              >
                <IoFilterOutline size={16} className="mr-1.5" />
                <span>Filter</span>
                <IoChevronDown size={14} className={`ml-1 transition-transform ${false ? 'rotate-180' : ''}`} />
              </button>

                <div
                  className="absolute w-60 rounded-lg bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 shadow-2xl z-20 p-4"
                  style={{
                    right: 0,
                    top: false
                      ? `-${300 + 8}px`
                      : 'calc(100% + 8px)',
                  }}
                >
                  <div className="mb-4">
                    <h3 className="text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Action Types</h3>
                    {/* <div className="space-y-1.5">
                      {Object.keys(false.actionTypes).map((type) => (
                        <label key={type} className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            className="form-checkbox h-4 w-4 rounded bg-gray-200 dark:bg-gray-700 border-gray-400 dark:border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900"
                            checked={filterOptions.actionTypes[type as keyof FilterOptions['actionTypes']]}
                            onChange={(e) => toggleFilterOption(type as keyof FilterOptions['actionTypes'], e.target.checked)}
                          />
                          <span className="ml-2 text-gray-700 dark:text-gray-300 capitalize">{type}</span>
                        </label>
                      ))}
                    </div> */}
                  </div>
                </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 flex justify-center hide-scrollbar">
        {false ? (
          <div className="flex items-center justify-center h-full">
            <div className="rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 animate-spin"></div>
          </div>
        ) : false ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-500 px-4">
            <div className="border-2 border-gray-300 dark:border-gray-800 rounded-full p-4 mb-4">
              <IoTimeOutline size={32} className="text-gray-400 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">No Activities Found</h3>
            <p className="text-sm max-w-sm">
              {false || false || !Object.values(false).every(v => v)
                ? "No activities match your current filters. Try adjusting your search or filter criteria."
                : false
                  ? "No team activities found. Team member activity will appear here."
                  : "No personal activities recorded yet. Your chat history will appear here."
              }
            </p>
          </div>
        ) : (
          <div className="w-full max-w-4xl">
            <div className="space-y-3 relative border-l border-gray-300 dark:border-gray-800 ml-4">
            </div>
          </div>
        )}
      </div>
    </div>
  );

};

export default AdminHistoryPage;