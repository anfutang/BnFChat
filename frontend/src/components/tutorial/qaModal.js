import React, { useState } from 'react';
import { VscGithubInverted } from 'react-icons/vsc';
import { FaEnvelope } from 'react-icons/fa';

// 示例问答数据
const qaData = [
  {
    question: "BnFChat qu'est-ce que c'est ? Pourquoi l'utiliser ?",
    answers: [
      '该项目旨在增强图书馆资源的可访问性，结合聊天技术为用户提供更自然的检索体验。',
      '我们整合了多个数据源，并使用了OpenAI API来支持自然语言处理。'
    ]
  },
  {
    question: "Je vois deux modes : Quel mode devrais-je choisir ?",
    answers: [
      '我们的代码是开源的，托管在GitHub上。',
      '点击下方GitHub图标可直接访问。'
    ]
  },
  {
    question: "Je voudrais signaler un problème / Je veux donner mes avis.",
    answers: [
      '您可以通过邮件联系项目负责人。',
      '点击信封图标即可自动打开您的邮件客户端。'
    ]
  },
  {
    question: "Quel est le lien entre cette application et Gallica ?",
    answers: [

    ]
  },
  {
    question: "Je rencontre des problèmes en utilisant l'interface.",
    answers: [

    ]
  },
  {
    question: "Je voudrais savoir plus sur les détailles techniques.",
    answers: [

    ]
  }
];

const QAModal = ({ setShowQAModal }) => {
  const [selectedIndex, setSelectedIndex] = useState(null); // 当前选中的问题索引
  const [page, setPage] = useState(0); // 当前回答页码

  const handleQuestionClick = (index) => {
    setSelectedIndex(index);
    setPage(0);
  };

  const goBackToMenu = () => {
    setSelectedIndex(null);
    setPage(0);
  };

  const currentQA = qaData[selectedIndex];

  return (
    <div className="info-modal-overlay" onClick={() => setShowQAModal(false)}>
      <div className="info-modal" onClick={(e) => e.stopPropagation()} style={{ height: "60%", width: "45%", padding: "1%" }}>
        <div className="about-info-modal-content" style={{ height: "90%", top: "1rem", display: 'flex', flexDirection: 'column' }}>
          <div className="about-info-item">
            <img src="/logo_bnfchat_rectangle.png" className='logo-bnfchat' style={{ height: "6vh" }} />
          </div>

          {/* 初始简介或问答展示 */}
          {selectedIndex === null ? (
            <>
              <p style={{ fontFamily: "monospace", fontSize: "1.5rem", fontWeight:"1000" }}>FAQ</p>
              <p></p>
              <p>您可以点击下方问题了解更多信息：</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {qaData.map((item, index) => (
                  <button key={index} onClick={() => handleQuestionClick(index)} style={{ padding: '6px', borderRadius: '5px', cursor: 'pointer' }}>
                    {item.question}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>问题：</strong> {currentQA.question}
              </div>
              <div style={{ flexGrow: 1, overflowY: 'auto', marginBottom: '0.5rem' }}>
                <p>{currentQA.answers[page]}</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={() => setPage((p) => Math.max(p - 1, 0))} disabled={page === 0}>上一页</button>
                <button onClick={goBackToMenu}>返回目录</button>
                <button onClick={() => setPage((p) => Math.min(p + 1, currentQA.answers.length - 1))} disabled={page === currentQA.answers.length - 1}>下一页</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default QAModal;