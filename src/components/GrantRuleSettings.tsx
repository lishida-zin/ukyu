import { useGrantRules } from '../hooks/useGrantRules';
import { useActiveProfile } from '../contexts/ActiveProfileContext';
import { calculateYearsOfService } from '../logic/grant-rules';

export function GrantRuleSettings() {
  const { rules, updateRule, deleteRule, loadDefaults, getRecommendedDays } =
    useGrantRules();
  const activeProfile = useActiveProfile();

  const hireDate = activeProfile?.hireDate ?? '';
  const today = new Date().toISOString().slice(0, 10);
  const yearsOfService = hireDate
    ? calculateYearsOfService(hireDate, today)
    : null;
  const recommendedDays =
    hireDate && rules ? getRecommendedDays(hireDate) : null;

  return (
    <div className="space-y-4">
      {yearsOfService !== null && (
        <p className="text-sm leading-relaxed">
          きんぞく年数: <span className="font-bold">{yearsOfService}年</span>
        </p>
      )}

      {recommendedDays !== null && recommendedDays > 0 && (
        <p className="text-sm leading-relaxed">
          おすすめふよ日数:{' '}
          <span className="font-bold text-lavender-dark">{recommendedDays}日</span>
        </p>
      )}

      {rules && rules.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm leading-relaxed">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-1 text-left font-bold">きんぞく年数</th>
                <th className="py-1 text-left font-bold">ふよ日数</th>
                <th className="py-1 w-10" />
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className="border-b border-gray-50">
                  <td className="py-1">
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      value={rule.yearsOfService}
                      onChange={(e) =>
                        rule.id &&
                        updateRule(rule.id, {
                          yearsOfService: Number(e.target.value),
                        })
                      }
                      aria-label={`きんぞく年数 ${rule.yearsOfService}年`}
                      className="w-20 rounded-lg border border-gray-200 px-2 py-1"
                    />
                  </td>
                  <td className="py-1">
                    <input
                      type="number"
                      min={0}
                      max={40}
                      value={rule.grantDays}
                      onChange={(e) =>
                        rule.id &&
                        updateRule(rule.id, {
                          grantDays: Number(e.target.value),
                        })
                      }
                      aria-label={`ふよ日数 ${rule.grantDays}日`}
                      className="w-20 rounded-lg border border-gray-200 px-2 py-1"
                    />
                  </td>
                  <td className="py-1 text-center">
                    <button
                      type="button"
                      onClick={() => rule.id && deleteRule(rule.id)}
                      className="min-w-[2.5rem] min-h-[2.5rem] flex items-center justify-center text-red-400 hover:text-red-600 active:scale-95 transition-transform"
                      aria-label="ルールを削除"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        type="button"
        onClick={loadDefaults}
        className="w-full rounded-xl border border-lavender-dark py-2 text-sm font-bold leading-relaxed text-lavender-dark hover:bg-lavender-light active:scale-95 transition-transform"
      >
        労基法のデフォルトをよみこむ
      </button>
    </div>
  );
}
