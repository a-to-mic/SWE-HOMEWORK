using System;
using System.Collections;
using System.Runtime.InteropServices;
using UnityEngine;
using UnityEngine.UI;

public class BattleBridge : MonoBehaviour
{
    [Header("Actors")]
    public Animator playerAnimator;
    public Animator enemyAnimator;

    [Header("HUD")]
    public Slider playerHp;
    public Slider enemyHp;
    public Text playerName;
    public Text enemyName;
    public Text playerPower;
    public Text enemyPower;

    [Serializable]
    public class BattleState
    {
        public string mode;
        public string playerName;
        public string enemyName;
        public float playerHp;
        public float playerMaxHp;
        public float enemyHp;
        public float enemyMaxHp;
        public int enemyPower;
    }

    [Serializable]
    public class SkillPayload
    {
        public string mode;
        public string choiceId;
        public string choiceName;
        public int playerValue;
        public int enemyValue;
        public float playerHpBefore;
        public float playerHpAfter;
        public float enemyHpBefore;
        public float enemyHpAfter;
        public bool victory;
    }

#if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")]
    private static extern void BattleAnimationDone(string payload);
#endif

    public void ReceiveBattleState(string json)
    {
        BattleState state = JsonUtility.FromJson<BattleState>(json);
        if (state == null) return;

        if (playerName) playerName.text = state.playerName;
        if (enemyName) enemyName.text = state.enemyName;
        if (playerPower) playerPower.text = "";
        if (enemyPower) enemyPower.text = state.enemyPower.ToString();

        SetSlider(playerHp, state.playerHp, state.playerMaxHp);
        SetSlider(enemyHp, state.enemyHp, state.enemyMaxHp);
    }

    public void PlaySkill(string json)
    {
        SkillPayload payload = JsonUtility.FromJson<SkillPayload>(json);
        if (payload == null) return;
        StopAllCoroutines();
        StartCoroutine(PlaySkillRoutine(payload, json));
    }

    private IEnumerator PlaySkillRoutine(SkillPayload payload, string rawJson)
    {
        SetText(playerPower, payload.playerValue.ToString());
        SetText(enemyPower, payload.enemyValue.ToString());

        SetTrigger(playerAnimator, string.IsNullOrEmpty(payload.choiceId) ? "normal" : payload.choiceId);
        yield return new WaitForSeconds(0.35f);

        if (payload.victory)
        {
            SetTrigger(enemyAnimator, "hit");
            SetSlider(enemyHp, payload.enemyHpAfter, 100f);
            yield return new WaitForSeconds(0.45f);
            SetTrigger(playerAnimator, "win");
            SetTrigger(enemyAnimator, "lose");
        }
        else
        {
            SetTrigger(enemyAnimator, "attack");
            yield return new WaitForSeconds(0.2f);
            SetTrigger(playerAnimator, "hit");
            SetSlider(playerHp, payload.playerHpAfter, 120f);
            yield return new WaitForSeconds(0.45f);
            SetTrigger(playerAnimator, "lose");
            SetTrigger(enemyAnimator, "win");
        }

        yield return new WaitForSeconds(0.15f);

#if UNITY_WEBGL && !UNITY_EDITOR
        BattleAnimationDone(rawJson);
#endif
    }

    private void SetSlider(Slider slider, float value, float maxValue)
    {
        if (!slider) return;
        slider.maxValue = Mathf.Max(1f, maxValue);
        slider.value = Mathf.Clamp(value, 0f, slider.maxValue);
    }

    private void SetText(Text text, string value)
    {
        if (text) text.text = value;
    }

    private void SetTrigger(Animator animator, string trigger)
    {
        if (!animator || string.IsNullOrEmpty(trigger)) return;
        animator.SetTrigger(trigger);
    }
}

